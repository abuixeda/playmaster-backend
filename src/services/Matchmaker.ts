
import * as fs from 'fs';

interface QueuedPlayer {
    userId: string;
    socketId: string;
    gameType: string;
    betAmount: number;
    elo: number;
    joinedAt: number;
}

export class Matchmaker {
    private static queue: QueuedPlayer[] = [];
    private static intervalId: NodeJS.Timeout | null = null;
    private static CHECK_INTERVAL_MS = 3000;
    private static ELO_EXPANSION_RATE = 50; // Expand range by 50 every check
    private static INITIAL_RANGE = 100;

    static log(msg: string) {
        try {
            const time = new Date().toLocaleTimeString();
            fs.appendFileSync('matchmaker_debug.log', `[${time}] ${msg}\n`);
        } catch (e) { console.error(e); }
    }

    static addToQueue(userId: string, socketId: string, gameType: string, betAmount: number, elo: number) {
        this.removeFromQueue(userId);

        const player: QueuedPlayer = {
            userId, socketId, gameType, betAmount, elo,
            joinedAt: Date.now()
        };
        this.queue.push(player);
        const msg = `Player ${userId} added. Type: ${gameType}, Bet: ${betAmount}, Elo: ${elo}, QueueSize: ${this.queue.length}`;
        console.log(`[Matchmaker] ${msg}`);
        this.log(msg);

        // Try immediate match
        const immediate = this.tryMatch(player);
        if (immediate.matchFound) return immediate;

        // Start background processor if not running
        this.startProcessor();

        return { matchFound: false };
    }

    static removeFromQueue(userId: string) {
        const idx = this.queue.findIndex(p => p.userId === userId);
        if (idx !== -1) {
            this.queue.splice(idx, 1);
            const msg = `Player ${userId} removed. QueueSize: ${this.queue.length}`;
            console.log(`[Matchmaker] ${msg}`);
            this.log(msg);
        }
        if (this.queue.length === 0) this.stopProcessor();
    }

    private static startProcessor() {
        if (this.intervalId) return;
        console.log("[Matchmaker] Starting background processor...");
        this.intervalId = setInterval(() => this.processQueue(), this.CHECK_INTERVAL_MS);
    }

    private static stopProcessor() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log("[Matchmaker] Stopping background processor.");
        }
    }

    private static processQueue() {
        // Iterate copy to avoid modification issues
        const snapshot = [...this.queue];

        for (const player of snapshot) {
            // Check if still in queue
            if (!this.queue.find(p => p.userId === player.userId)) continue;

            const match = this.tryMatch(player);
            if (match.matchFound && match.opponent && match.gameId) {
                // Emit event to external handler? 
                // Since this is static service, we might need a callback or EventEmmiter.
                // For now, let's assume SocketServer handles the "Join" via a polling mechanism or we need to Refactor to accept a callback.
                // To keep it simple: we just leave them in queue?! No, tryMatch removes them.
                // BUT we need to Notify them.

                // CRITICAL: We need a way to notify SocketServer.
                // We'll attach a listener or export an event.
                // Let's use a simple static callbacks array for now.
                if (this.onMatchFound) {
                    this.onMatchFound(match.opponent, player, match.gameId);
                }
            }
        }
    }

    // Callback injection
    static onMatchFound: (p1: QueuedPlayer, p2: QueuedPlayer, gameId: string) => void;

    static tryMatch(player: QueuedPlayer): { matchFound: boolean, opponent?: QueuedPlayer, gameId?: string } {
        const waitingTimeSeconds = (Date.now() - player.joinedAt) / 1000;
        const expansions = Math.floor(waitingTimeSeconds / (this.CHECK_INTERVAL_MS / 1000));
        const allowedDiff = this.INITIAL_RANGE + (expansions * this.ELO_EXPANSION_RATE);

        this.log(`Attempting match for ${player.userId} (Elo ${player.elo}, AllowedDiff ${allowedDiff}, Game ${player.gameType}, Bet ${player.betAmount})`);

        const opponent = this.queue.find(p =>
            p.userId !== player.userId &&
            p.gameType === player.gameType &&
            p.betAmount === player.betAmount &&
            Math.abs(p.elo - player.elo) <= allowedDiff
        );

        if (opponent) {
            this.removeFromQueue(player.userId);
            this.removeFromQueue(opponent.userId);

            const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
            const msg = `MATCH FOUND: ${player.userId} vs ${opponent.userId} -> Game ${gameId}`;
            console.log(`[Matchmaker] ${msg}`);
            this.log(msg);
            return { matchFound: true, opponent, gameId };
        } else {
            this.log(`No match for ${player.userId}. Queue size: ${this.queue.length}. Potential opponents: ${this.queue.map(p => p.userId).join(',')}`);
        }

        return { matchFound: false };
    }
}

