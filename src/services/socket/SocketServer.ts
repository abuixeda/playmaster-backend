
import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { TrucoLogic } from "../truco/TrucoLogic";
import { TrucoState, TrucoMove } from "../truco/TrucoTypes";
import { ChessLogic } from "../chess/ChessLogic";
import { ChessMove } from "../chess/ChessTypes";

import { ChessState } from "../chess/ChessTypes";

import { RPSLogic } from "../rps/RPSLogic";
import { RPSState } from "../rps/RPSTypes";
import { PoolLogic } from '../pool/PoolLogic';
import { PoolState, PoolMove } from '../pool/PoolTypes';
import { Matchmaker } from '../Matchmaker';
import { GameRepository } from "../../repositories/GameRepository";
import { GameService } from "../GameService";
import { verifyToken, JWTPayload } from "../../lib/jwt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface GameSession {
    gameId: string;
    state: TrucoState | ChessState | RPSState | PoolState;
    players: { [socketId: string]: string }; // socketId -> playerId
    orderedPlayers: string[]; // [0] = White/P1, [1] = Black/P2
    spectators: string[];
    gameType: string;

    turnTimer?: NodeJS.Timeout;
    turnDeadline?: number;
    disconnectTimers: { [playerId: string]: NodeJS.Timeout };
}

export class SocketServer {
    private io: SocketIOServer;
    private sessions: { [gameId: string]: GameSession } = {};

    // Timeouts
    private static TRUCO_TURN_MS = 30000;
    private static CHESS_TURN_MS = 45000;
    private static RPS_ROUND_MS = 15000;
    private static RECONNECT_MS = 30000;

    constructor(httpServer: HttpServer) {
        this.io = new SocketIOServer(httpServer, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });

        this.io.on("connection", (socket) => this.handleConnection(socket));

        // Register Matchmaker Callback
        Matchmaker.onMatchFound = (p1, p2, gameId) => {
            this.setupMatch(p1, p2, gameId);
        };
    }

    // --- TURN TIMER LOGIC ---
    private startTurnTimer(gameId: string, activePlayerId: string) {
        const session = this.sessions[gameId];
        if (!session) return;

        this.clearTurnTimer(gameId);
        // Determine Duration
        let duration = 60000; // default
        if (session.gameType === "TRUCO") duration = SocketServer.TRUCO_TURN_MS;
        else if (session.gameType === "CHESS") duration = SocketServer.CHESS_TURN_MS;
        else if (session.gameType === "RPS") {
            duration = SocketServer.RPS_ROUND_MS;
            // For RPS, activePlayerId might be ignored or used as "timer starter"
            // We use handleTurnTimeout with a special flag or logic for RPS
        }

        session.turnTimer = setTimeout(() => {
            if (session.gameType === "RPS") {
                this.handleRPSTimeout(gameId);
            } else {
                this.handleTurnTimeout(gameId, activePlayerId);
            }
        }, duration);

        // Expose deadline to client
        session.turnDeadline = Date.now() + duration;

        // Broadcast new deadline immediately? 
        // Or wait for next game_state emit?
        // Ideally emit a specific "timer_update" or just let game_state handle it if called nearby.
        // Calling game_state here might be redundant if caller does it, but safer for UI sync.
        // Let's emit a lightweight update
        this.io.to(gameId).emit("timer_update", {
            deadline: session.turnDeadline,
            playerId: session.gameType === "RPS" ? undefined : activePlayerId
        });
    }

    private clearTurnTimer(gameId: string) {
        const session = this.sessions[gameId];
        if (session) {
            if (session.turnTimer) {
                clearTimeout(session.turnTimer);
                delete session.turnTimer;
            }
            delete session.turnDeadline;
            this.io.to(gameId).emit("timer_cleared");
        }
    }

    // --- DISCONNECT TIMER LOGIC ---
    private startDisconnectTimer(gameId: string, playerId: string) {
        const session = this.sessions[gameId];
        if (!session) return;

        // If it was their turn, stop the turn timer so they don't timeout while reconnecting
        // (They get a fresh turn timer on reconnect - slight exploit but user friendly)
        // We need to check if it WAS their turn.
        // Simplified: Just clear turn timer. If illegal (not their turn), it doesn't matter much 
        // as turn timer is global for the session usually.
        // Actually turn timer is unique per session.
        this.clearTurnTimer(gameId);

        console.log(`[Timer] Starting 30s disconnect grace period for ${playerId}`);

        if (session.disconnectTimers[playerId]) clearTimeout(session.disconnectTimers[playerId]);

        session.disconnectTimers[playerId] = setTimeout(() => {
            this.handleTurnTimeout(gameId, playerId); // Reuse timeout logic (loss)
        }, SocketServer.RECONNECT_MS);
    }

    private clearDisconnectTimer(gameId: string, playerId: string) {
        const session = this.sessions[gameId];
        if (session && session.disconnectTimers[playerId]) {
            console.log(`[Timer] Recovered! Clearing disconnect timer for ${playerId}`);
            clearTimeout(session.disconnectTimers[playerId]);
            delete session.disconnectTimers[playerId];
        }
    }


    private handleRPSTimeout(gameId: string) {
        const session = this.sessions[gameId];
        if (!session) return;

        const rpsState = session.state as RPSState;
        const players = Object.keys(session.players);

        // Find who hasn't played
        const inactivePlayers = players.filter(pid =>
            !rpsState.players[pid] || !rpsState.players[pid].choice
        );

        if (inactivePlayers.length > 0) {
            console.log(`[Timer] RPS Timeout. Inactive: ${inactivePlayers.join(", ")}`);

            // If ONE inactive -> The other wins
            if (inactivePlayers.length === 1) {
                const winnerId = players.find(p => p !== inactivePlayers[0]);
                if (winnerId) {
                    this.io.to(gameId).emit("game_over", {
                        winnerId,
                        reason: "AFK_TIMEOUT",
                        message: "El oponente no eligió a tiempo."
                    });
                    GameService.finishGame(gameId, winnerId);
                    delete this.sessions[gameId];
                }
            } else {
                // BOTH inactive? Draw / Void
                // Or maybe just random pick? 
                // Let's go with VOID round or Generic Timeout.
                // For now: Void game (refunds handled by finishGame TIE?)
                // GameService.finishGame(gameId, "TIE");
                this.io.to(gameId).emit("game_over", {
                    winnerId: "TIE",
                    reason: "AFK_TIMEOUT",
                    message: "Tiempo agotado. Empate."
                });
                GameService.finishGame(gameId, "TIE");
                delete this.sessions[gameId];
            }
        }
    }

    private handleTurnTimeout(gameId: string, losingPlayerId: string) {
        const session = this.sessions[gameId];
        if (!session) return;

        console.log(`[Timer] Timeout for ${losingPlayerId} in game ${gameId}. Auto-forfeit.`);

        // Determine Winner (The other player)
        // This logic assumes 2 player games.
        const players = Object.values(session.players);
        const winnerId = players.find(p => p !== losingPlayerId);

        if (winnerId) {
            // Force Game End
            (session.state as any).status = "FINISHED";
            (session.state as any).winner = winnerId;
            (session.state as any).winnerId = winnerId; // Support both conventions

            this.io.to(gameId).emit("game_state", {
                ...session.state,
                gameType: session.gameType,
                gameId,
                turnDeadline: session.turnDeadline
            });

            this.io.to(gameId).emit("game_over", {
                winnerId,
                reason: "AFK_TIMEOUT",
                message: "El oponente no jugó a tiempo."
            });

            GameService.finishGame(gameId, winnerId)
                .then(() => console.log(`[Timer] Auto-finish resolved for ${gameId}`))
                .catch(e => console.error(`[Timer] Auto-finish failed: ${e}`));

            // Clean Session?
            delete this.sessions[gameId];
        }
    }

    private handleConnection(socket: Socket) {
        // AUTHENTICATION
        const token = socket.handshake.auth.token;
        let userId = "guest_" + socket.id; // Default Guest ID
        let isAuthenticated = false;

        console.log(`[Socket] New connection attempt: ${socket.id}`);
        console.log(`[Socket] Token received: ${token ? "YES (Length: " + token.length + ")" : "NO"}`);

        if (token) {
            try {
                const decoded = verifyToken<JWTPayload>(token);
                if (decoded && decoded.id) {
                    userId = decoded.id;
                    isAuthenticated = true;
                    console.log(`[Socket] Auth Success! User ID: ${userId}`);
                    (socket as any).userId = userId;
                }
            } catch (e) {
                console.log("[Socket] Auth Failed (Verify Error):", e);
            }
        } else {
            console.log("[Socket] No Token provided. Treating as Guest.");
        }

        console.log(`[Socket] Final Identity: ${userId} (Authenticated: ${isAuthenticated})`);

        socket.on("join_game", ({ gameId, playerId, gameType }) => {
            // Force usage of authenticated ID if available?
            // Or allow client to say who they are?
            // SECURITY: If authenticated, playerId MUST match auth ID.
            const effectivePlayerId = isAuthenticated ? userId : playerId;
            try {
                this.handleJoinGame(socket, gameId, effectivePlayerId, gameType);
            } catch (e: any) {
                console.error("HandleJoinGame Error:", e);
                socket.emit("error", { message: "Join Failed: " + e.message });
            }
        });

        socket.on("play_move", ({ gameId, move }) => {
            // We can check if move.playerId matches socket internal user ID here to prevent spoofing
            this.handleMove(socket, gameId, move);
            this.handleMove(socket, gameId, move);
        });

        // Initialize Matchmaker Callback if not set
        if (!Matchmaker.onMatchFound) {
            Matchmaker.onMatchFound = (opponent, player, gameId) => {
                this.setupMatch(player, opponent, gameId);
            };
        }

        // MATCHMAKING EVENTS
        socket.on("find_match", ({ gameType, betAmount }) => {
            this.handleFindMatch(socket, userId, gameType, betAmount);
        });

        socket.on("cancel_search", () => {
            Matchmaker.removeFromQueue(userId);
            socket.emit("search_cancelled");
        });

        socket.on("disconnect", () => {
            console.log(`Socket disconnected: ${socket.id}`);
            Matchmaker.removeFromQueue(userId); // Ensure removed from queue
            this.handleDisconnect(socket);
        });

        // --- CHAT EVENTS ---
        socket.on("chat:send", ({ gameId, message }) => {
            // Basic Validation
            if (!gameId || !message || typeof message !== 'string') return;

            const cleanMessage = message.trim().slice(0, 200); // Check length
            if (cleanMessage.length === 0) return;

            const session = this.sessions[gameId];
            if (!session) return;

            const playerId = session.players[socket.id];
            if (!playerId) return;

            // Optional: Get Username (if available in session or user map)
            // For now, send playerId or "User"
            // We can try to look up username from session state if we injected it
            let username = "Jugador";
            const pState = (session.state as any).players;
            if (Array.isArray(pState)) {
                // Truco/Chess/Pool/RPS usually have players array or object
                const pObj = pState.find((p: any) => p.playerId === playerId) ||
                    (session.state as any).players[playerId]; // RPS style
                if (pObj && pObj.username) username = pObj.username;
            } else if ((session.state as any).players && (session.state as any).players[playerId]) {
                // RPS Dictionary style
                if ((session.state as any).players[playerId].username) {
                    username = (session.state as any).players[playerId].username;
                }
            }

            console.log(`[Chat] ${gameId} - ${username}: ${cleanMessage}`);

            // Broadcast to Room
            this.io.to(gameId).emit("chat:receive", {
                playerId,
                username,
                message: cleanMessage,
                timestamp: Date.now()
            });
        });
    }

    private async handleJoinGame(socket: Socket, gameId: string, playerId: string, gameType: string = "TRUCO") {
        console.log(`[Socket] handleJoinGame called for ${gameId}, player ${playerId}, type ${gameType}`);
        let session = this.sessions[gameId];

        // 1. Try to load from DB if not in memory (Recovery)
        if (!session) {
            const dbGame = await GameRepository.findById(gameId);
            if (dbGame) {
                // Reconstruct session from DB
                const loadedState = dbGame.gameState as any;
                const loadedPlayers: { [s: string]: string } = {};
                // Map DB players to a generic socket placeholders or just store IDs
                // Ideally we don't have socket IDs in DB.
                // We rely on new socket connection to re-register.

                session = {
                    gameId,
                    state: loadedState && Object.keys(loadedState).length > 0 ? loadedState : this.createInitialStateForType(gameType),
                    players: {}, // Will fill with current socket
                    orderedPlayers: dbGame.players.map(p => p.userId), // Simplification: assuming order isn't strictly tracked in generic DB schema yet, or we need to sort by createdAt
                    spectators: [],
                    gameType: dbGame.typeCode,
                    disconnectTimers: {}
                };

                // If it's a fresh DB game with no state, init it
                if (!loadedState || Object.keys(loadedState).length === 0) {
                    session.state = this.createInitialStateForType(gameType);
                }

                this.sessions[gameId] = session;
                console.log(`Restored game ${gameId} from DB`);
            }
        }

        // 2. If still no session, Create New in DB and Memory
        if (!session) {
            console.log(`Creating new game ${gameId} in DB`);
            const type = gameType.toUpperCase();

            // Persist Creation
            try {
                // Ensure we respect the Client's ID but persist it
                await GameRepository.createWithId(gameId, type);
            } catch (error) {
                // If it exists (race condition), just ignore
                console.log("DB Create Note (might exist):", (error as Error).message);
            }

            session = {
                gameId,
                state: this.createInitialStateForType(type),
                players: {},
                orderedPlayers: [],
                spectators: [],
                gameType: type,
                disconnectTimers: {}
            } as any;
            this.sessions[gameId] = session;
        }

        // Register player
        const existingSockets = Object.keys(session.players);
        const isReconnection = Object.values(session.players).includes(playerId);

        if (isReconnection) {
            const oldSocketId = Object.keys(session.players).find(key => session.players[key] === playerId);
            if (oldSocketId) delete session.players[oldSocketId];
            console.log(`Player ${playerId} reconnected`);
        } else {
            // New Player in Session -> Join in DB
            try {
                await GameRepository.joinGame(gameId, playerId);
            } catch (e) {
                // If already joined (re-join same user ID), ignore unique constraint
                console.log("DB Join Note:", (e as Error).message);
            }
        }

        session.players[socket.id] = playerId;

        // RPS & POOL Init logic (Sync State with Session Players)
        if (session.gameType === "RPS") {
            const rpsState = session.state as RPSState;
            const onlineIds = Object.values(session.players);

            // Check for ghosts
            Object.keys(rpsState.players).forEach(id => {
                if (!onlineIds.includes(id) && id !== playerId) {
                    delete rpsState.players[id];
                }
            });
            // Add self
            if (!rpsState.players[playerId]) rpsState.players[playerId] = { choice: null, score: 0 };
        }

        // Check Logic for Starting Game (2 players)
        const uniquePlayers = Array.from(new Set(Object.values(session.players)));
        const type = (session as any).gameType || "TRUCO";

        if (uniquePlayers.length === 2) {
            if (type === "TRUCO") {
                const isTrucoStarted = (session.state as TrucoState).players?.[0]?.cards?.length > 0;
                if (!isTrucoStarted) {
                    session.state = TrucoLogic.createInitialState(uniquePlayers, { targetScore: 30, withFlor: true });
                    console.log(`[Socket] TRUCO STARTED for ${gameId}. Players: ${uniquePlayers.length}`);
                    console.log(`[Socket] P1 Cards: ${(session.state as TrucoState).players[0]?.cards?.length}`);
                    console.log(`[Socket] P2 Cards: ${(session.state as TrucoState).players[1]?.cards?.length}`);
                }
            } else if (type === "CHESS") {
                session.orderedPlayers = [...uniquePlayers];
                (session.state as any).players = session.orderedPlayers.map(pid => ({ playerId: pid }));
            } else if (type === "POOL") {
                const poolState = session.state as PoolState;
                if (!poolState.currentPlayer) poolState.currentPlayer = uniquePlayers[0];
            }

            // INJECT USERNAMES
            try {
                const users = await prisma.user.findMany({
                    where: { id: { in: uniquePlayers } },
                    select: { id: true, username: true }
                });
                const userMap = users.reduce((acc, u) => ({ ...acc, [u.id]: u.username }), {} as Record<string, string>);

                if (type === "TRUCO") {
                    (session.state as TrucoState).players.forEach(p => {
                        if (userMap[p.playerId]) p.username = userMap[p.playerId];
                    });
                } else if (type === "CHESS") {
                    if ((session.state as any).players) {
                        (session.state as any).players.forEach((p: any) => {
                            if (userMap[p.playerId]) p.username = userMap[p.playerId];
                        });
                    }
                } else if (type === "RPS") {
                    const rpsState = session.state as RPSState;
                    Object.keys(rpsState.players).forEach(pid => {
                        if (userMap[pid]) rpsState.players[pid].username = userMap[pid];
                    });
                }
                console.log(`[Socket] Injected usernames for Game ${gameId}:`, userMap);
            } catch (err) {
                console.error("Failed to inject usernames:", err);
            }

            // START FIRST TURN TIMER
            if (type === "TRUCO") {
                const tState = session.state as TrucoState;
                if (tState.turn) this.startTurnTimer(gameId, tState.turn);
            } else if (type === "CHESS") {
                // White starts (orderedPlayers[0])
                if (session.orderedPlayers[0]) this.startTurnTimer(gameId, session.orderedPlayers[0]);
            } else if (type === "RPS") {
                // Start Round Timer immediately
                this.startTurnTimer(gameId, "ANY"); // ID doesn't matter for RPS start
            }
        }

        // CLEAR DISCONNECT TIMER IF RECONNECTING
        this.clearDisconnectTimer(gameId, playerId);

        // If it IS this player's turn, and timer was stopped by disconnect, RESTART IT
        // (Simple check: if no turn timer is running, but game is active, and it is my turn -> Start)
        const isMyTurn = (
            (session.gameType === "TRUCO" && (session.state as TrucoState).turn === playerId) ||
            (session.gameType === "CHESS" && (session.state as ChessState).turn === (session.orderedPlayers[0] === playerId ? 'w' : 'b'))
        );

        if (isMyTurn && !session.turnTimer && (session.state as any).status === "ACTIVE") {
            this.startTurnTimer(gameId, playerId);
        }

        socket.join(gameId);
        (socket as any).gameId = gameId; // Track for disconnect

        this.io.to(gameId).emit("game_state", {
            ...session.state,
            gameType: session.gameType,
            gameId,
            turnDeadline: session.turnDeadline
        });
        this.io.to(gameId).emit("player_joined", { playerId });
    }

    private handleDisconnect(socket: Socket) {
        const gameId = (socket as any).gameId;
        if (gameId && this.sessions[gameId]) {
            const session = this.sessions[gameId];
            if (session.players[socket.id]) {
                const playerId = session.players[socket.id];
                delete session.players[socket.id];
                console.log(`Removed ${playerId} from session ${gameId} (Disconnect)`);

                // START DISCONNECT TIMER
                // Only if game is active
                if ((session.state as any).status !== "FINISHED") {
                    this.startDisconnectTimer(gameId, playerId);
                    this.io.to(gameId).emit("player_disconnected", { playerId });
                }
            }
        }
    }

    private createInitialStateForType(type: string) {
        if (type === "CHESS") return ChessLogic.createInitialState();
        if (type === "RPS") return RPSLogic.createInitialState();
        if (type === "POOL") return PoolLogic.createInitialState();
        return this.createInitialState();
    }



    private handleMove(socket: Socket, gameId: string, move: any) {
        const session = this.sessions[gameId];
        console.log(`[Socket] handleMove called: ${gameId}. Session exists? ${!!session}`);
        if (!session) return;
        const gameType = (session as any).gameType || "TRUCO";
        console.log(`[Socket] handleMove GameType: ${gameType}`);

        const playerId = session.players[socket.id];
        if (!playerId) return;

        // SECURITY: Enforce that the move comes from the identified player
        move.playerId = playerId;

        // Clear timer for THIS player since they moved
        this.clearTurnTimer(gameId);

        // Handle Rematch (Generic)
        if (move.action === "REMATCH") {
            const newState = TrucoLogic.resetMatch(session.state as TrucoState);
            session.state = newState;
            this.io.to(gameId).emit("game_state", { ...session.state, gameType: session.gameType, gameId });
            return;
        }

        let moveApplied = false;

        if (gameType === "CHESS") {
            const chessMove = move as ChessMove;
            const err = ChessLogic.validateMove(session.state as any, chessMove);
            if (err) {
                socket.emit("move_error", { message: err });
                return;
            }
            const newCs = ChessLogic.applyMove(session.state as ChessState, chessMove);
            session.state = newCs;
            // Hacky strict-mode fix
            (session.state as any).players = session.orderedPlayers.map(pid => ({ playerId: pid }));
            moveApplied = true;

        } else if (gameType === "RPS") {
            console.log(`[Socket] RPS Move Rx: Player ${playerId}, Action: ${move.action || move.choice}`);
            if (move.action === "RESET") {
                session.state = RPSLogic.resetRound(session.state as RPSState);
                console.log("[Socket] RPS Round Reset");
                // Restart Timer for new round
                this.startTurnTimer(gameId, "ANY");
            } else {
                session.state = RPSLogic.applyMove(session.state as RPSState, move);
                console.log("[Socket] RPS Move Applied. New State:", JSON.stringify(session.state));

                // If round complete (winner determined or draw revealed), clear timer.
                // Assuming applyMove updates status or we check choices. 
                // Actually RPSLogic usually resolves immediately if both picked.
                const rpsState = session.state as RPSState;
                if (rpsState.winner || rpsState.winner === "TIE") { // Logic might set winner ID
                    this.clearTurnTimer(gameId);
                }
            }
            moveApplied = true;

        } else if (gameType === "POOL") {
            const poolState = session.state as PoolState;
            const poolMove = move as PoolMove;
            const poolPlayerIds = Object.keys(session.players);
            session.state = PoolLogic.applyMove(poolState, poolMove, poolPlayerIds);

            if (poolMove.action === "SHOT_START") {
                this.io.to(gameId).emit("pool_shot", {
                    angle: poolMove.angle,
                    force: poolMove.force,
                    playerId: poolMove.playerId
                });
            }
            moveApplied = true;

        } else {
            // --- TRUCO LOGIC ---
            // Basic validation check (turn) can be strict or loose. TrucoLogic handles it.

            // Validate Move
            const error = TrucoLogic.validateMove(session.state as TrucoState, move, playerId);
            if (error) {
                socket.emit("move_error", { message: error });
                return;
            }

            // Apply Move
            const newState = TrucoLogic.applyMove(session.state as TrucoState, move, playerId);
            session.state = newState;

            this.io.to(gameId).emit("move_played", { playerId, move });
            moveApplied = true;

            // Truco Specific: Auto-deal next hand
            if (newState.status === "WAITING_FOR_NEXT_HAND") {
                this.clearTurnTimer(gameId); // Pause during default delay
                setTimeout(() => {
                    TrucoLogic.startNextHand(session.state as TrucoState);
                    this.io.to(gameId).emit("game_state", session.state);
                    // Persist again for new hand? Yes, ideally.
                    GameRepository.updateState(gameId, session.state).catch(e => console.error(e));

                    // Restart Timer for the new hand's dealer/turn
                    const newTState = session.state as TrucoState;
                    if (newTState.turn) this.startTurnTimer(gameId, newTState.turn);

                }, 5000);
            }
        }

        if (moveApplied) {
            // Broadcast new state
            this.io.to(gameId).emit("game_state", {
                ...session.state,
                gameType: session.gameType,
                gameId,
                turnDeadline: session.turnDeadline
            });

            // PERSISTENCE & FINISH CHECK
            GameRepository.updateState(gameId, session.state)
                .then(() => {
                    // 1. RESTART TIMER FOR NEXT PLAYER
                    if (session.state.status !== "FINISHED" && session.gameType !== "RPS") {
                        if (gameType === "TRUCO") {
                            const tState = session.state as TrucoState;
                            if (tState.status === "ACTIVE" && tState.turn) {
                                this.startTurnTimer(gameId, tState.turn);
                            }
                        } else if (gameType === "CHESS") {
                            const cState = session.state as ChessState;
                            if (cState.status === "ACTIVE") {
                                const nextColor = cState.turn; // 'w' or 'b'
                                const list = session.orderedPlayers;
                                const nextPid = nextColor === 'w' ? list[0] : list[1];
                                if (nextPid) this.startTurnTimer(gameId, nextPid);
                            }
                        }
                    }

                    // 2. CHECK FOR GAME OVER
                    const s = session.state as any;
                    const isFinished = s.status === "FINISHED" || s.isGameOver === true;

                    if (isFinished) {
                        this.clearTurnTimer(gameId); // Ensure timer is stopped

                        let winnerId = s.winner || s.winnerId;

                        if (gameType === "CHESS" && session.orderedPlayers.length >= 2) {
                            if (winnerId === "w") winnerId = session.orderedPlayers[0];
                            else if (winnerId === "b") winnerId = session.orderedPlayers[1];
                            else if (winnerId === "draw") winnerId = "TIE";
                        }

                        console.log(`[GameFinished] Game ${gameId} ended. Winner: ${winnerId}. Triggering Payouts...`);
                        GameService.finishGame(gameId, winnerId)
                            .then(res => console.log(`[Payouts] Result for ${gameId}:`, res))
                            .catch(err => console.error(`[Payouts] Error for ${gameId}:`, err));
                    }
                })
                .catch(err => console.error("DB State Update Failed:", err));
        }
    }

    private createInitialState(): TrucoState {
        // This method is now used only for the very first joiner (WAITING state)
        // or we can return a "waiting" status state.
        // For simplicity, return a dummy active state or handle undefined state in Frontend.
        // Let's return a dummy state that says "WAITING_FOR_PLAYERS" (we might need to add this status to type)
        // Or just standard state with empty cards.
        return {
            options: { targetScore: 30, withFlor: true },
            currentRound: 0,
            turn: "",
            dealer: "",
            handWinner: null,
            players: [],
            scoreA: 0,
            scoreB: 0,
            currentTableCards: [],
            roundWinners: [],
            status: "ACTIVE", // Or waiting logic
            pointsToScore: 1,
            pendingChallenge: null,
            envidoPlayed: false
        };
    }
    // Callback injection
    // (Constructor already defined above, merging logic)

    private async setupMatch(p1: any, p2: any, gameId: string) {
        console.log(`[Socket] Setting up ASYNC match: ${p1.userId} vs ${p2.userId}`);
        const s1 = this.io.sockets.sockets.get(p1.socketId);
        const s2 = this.io.sockets.sockets.get(p2.socketId);

        if (s1 && s2) {
            // CRITICAL: Create Game FIRST (so BetLock FK works)
            try {
                await GameRepository.createWithId(gameId, p1.gameType);
            } catch (e) {
                console.log("Game creation warning:", (e as Error).message);
            }

            // Lock Funds
            const betsLocked = await GameService.createMatchBets(gameId, p1.userId, p2.userId, p1.betAmount);
            if (!betsLocked) {
                console.error(`[Socket] Match Aborted: Failed to lock funds for ${gameId}`);
                s1.emit("match_error", { message: "Failed to process bets. Refund issued if applicable." });
                s2.emit("match_error", { message: "Failed to process bets. Refund issued if applicable." });
                return;
            }

            // Proceed to join
            await this.handleJoinGame(s1, gameId, p1.userId, p1.gameType);
            await this.handleJoinGame(s2, gameId, p2.userId, p2.gameType);
            this.io.to(gameId).emit("match_found", { gameId, gameType: p1.gameType, betAmount: p1.betAmount });
        } else {
            console.error("One of the players disconnected during match setup");
        }
    }

    private async handleFindMatch(socket: Socket, userId: string, gameType: string, betAmount: any) {
        try {
            const amount = Number(betAmount);
            console.log(`[Socket] User ${userId} searching match for ${gameType} ($${amount})`);

            socket.emit("search_started");

            // Use global prisma/repository if possible, or robust fetch
            // Using GameRepository's prisma instance or similar if available, or imports
            // For now, assuming top-level 'prisma' import (like in GameService) isn't available in this class scope context easily unless captured.
            // But wtf, we can just import it at top of file.
            // Let's use the dynamic import but CAREFULLY.

            // Actually, let's look at imports. We probably have access to a UserRepo.
            // Let's use UserRepository if available?
            // "import { UserRepository } from '../../repositories/UserRepository';"
            // Checking file imports... (I can't see them now, but usually Repo is better)

            // Fallback: Safe Try/Catch with explicit error logging
            const { PrismaClient } = await import("@prisma/client");
            const prisma = new PrismaClient(); // Warn: This is bad for perf but safe for debugging crash.

            const user = await prisma.user.findUnique({ where: { id: userId } });

            // Log if user not found
            if (!user) {
                console.error(`[Socket] Match Error: User ${userId} not found in DB`);
                socket.emit("error", { message: "User profile not found" });
                return;
            }

            const elo = user.elo || 1200;
            console.log(`[Socket] Adding to queue: ${userId} (Elo: ${elo})`);

            const result = Matchmaker.addToQueue(userId, socket.id, gameType, amount, elo);

            if (result.matchFound && result.opponent && result.gameId) {
                this.setupMatch({ userId, socketId: socket.id, gameType, betAmount: amount, elo }, result.opponent, result.gameId);
            }
        } catch (e: any) {
            console.error(`[Socket] handleFindMatch CRITICAL ERROR for ${userId}:`, e);
            socket.emit("error", { message: "Server error during matchmaking" });
        }
    }
}
