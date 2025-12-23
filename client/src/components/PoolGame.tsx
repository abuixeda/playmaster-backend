import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { Socket } from 'socket.io-client';
import { ChatBox } from './ChatBox';

interface PoolGameProps {
    gameState: any;
    playerId: string;
    gameId: string;
    socket: Socket;
}

export const PoolGame: React.FC<PoolGameProps> = ({ gameState, playerId, gameId, socket }) => {
    const sceneRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<Matter.Engine | null>(null);
    const renderRef = useRef<Matter.Render | null>(null);
    const ballsRef = useRef<{ [id: number]: Matter.Body }>({});
    const isSimulating = useRef(false);

    // Game State from Props
    const [myTurn, setMyTurn] = useState(false);
    const [cueData, setCueData] = useState<{ start: { x: number, y: number }, current: { x: number, y: number } } | null>(null);
    const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);
    const [winner, setWinner] = useState<string | null>(null);

    // Dimensions
    const WIDTH = 800;
    const HEIGHT = 400;
    const BALL_RADIUS = 10;

    // Sync React State with GameState
    useEffect(() => {
        setMyTurn(gameState.currentPlayer === playerId);
        if (gameState.winner) setWinner(gameState.winner);
    }, [gameState, playerId]);

    // Initialize Matter.js
    useEffect(() => {
        if (!sceneRef.current) return;

        // Setup Engine
        const engine = Matter.Engine.create();
        engine.gravity.y = 0; // Top-down view, no gravity
        engineRef.current = engine;

        // Setup Render
        const render = Matter.Render.create({
            element: sceneRef.current,
            engine: engine,
            options: {
                width: WIDTH,
                height: HEIGHT,
                wireframes: false,
                background: '#0f5e3e' // Felt Green
            }
        });
        renderRef.current = render;

        // Create Table Bounds (Cushions)
        const walls = [
            Matter.Bodies.rectangle(WIDTH / 2, -25, WIDTH, 50, { isStatic: true, render: { fillStyle: '#3e2723' } }), // Top
            Matter.Bodies.rectangle(WIDTH / 2, HEIGHT + 25, WIDTH, 50, { isStatic: true, render: { fillStyle: '#3e2723' } }), // Bottom
            Matter.Bodies.rectangle(-25, HEIGHT / 2, 50, HEIGHT, { isStatic: true, render: { fillStyle: '#3e2723' } }), // Left
            Matter.Bodies.rectangle(WIDTH + 25, HEIGHT / 2, 50, HEIGHT, { isStatic: true, render: { fillStyle: '#3e2723' } }) // Right
        ];
        Matter.World.add(engine.world, walls);

        // Pockets (Visual Sensors)
        const pocketOptions = { isStatic: true, isSensor: true, render: { fillStyle: '#1a1a1a' } };
        const pocketRadius = 25; // Bigger visual
        const pockets = [
            Matter.Bodies.circle(0, 0, pocketRadius, pocketOptions), // Top-Left
            Matter.Bodies.circle(WIDTH / 2, -10, pocketRadius, pocketOptions), // Top-Mid
            Matter.Bodies.circle(WIDTH, 0, pocketRadius, pocketOptions), // Top-Right
            Matter.Bodies.circle(0, HEIGHT, pocketRadius, pocketOptions), // Bot-Left
            Matter.Bodies.circle(WIDTH / 2, HEIGHT + 10, pocketRadius, pocketOptions), // Bot-Mid
            Matter.Bodies.circle(WIDTH, HEIGHT, pocketRadius, pocketOptions), // Bot-Right
        ];
        Matter.World.add(engine.world, pockets);

        // RESET ballsRef to ensure we don't use stale bodies from previous mounts
        ballsRef.current = {};

        // Initial Balls (From Server State)
        updateBallsFromState(gameState.balls);

        // Run
        Matter.Render.run(render);
        const runner = Matter.Runner.create();
        Matter.Runner.run(runner, engine);

        // Cleanup
        return () => {
            Matter.Render.stop(render);
            Matter.Runner.stop(runner);
            if (render.canvas) render.canvas.remove();
            engineRef.current = null; // Prevent leak?
        };
    }, []);

    // Handling Server Updates (Positions)
    // Only update if not shooting, or if it's a "Reset"
    // We need to be careful not to jitter if we are simulating locally.
    useEffect(() => {
        if (!engineRef.current) return;

        // If server says shot is over, unlock local sim
        if (!gameState.shotInProgress && isSimulating.current) {
            isSimulating.current = false;
        }

        // Check local simulation flag AND server flag
        if (!gameState.shotInProgress && !isSimulating.current) {
            updateBallsFromState(gameState.balls);
        }
    }, [gameState.balls, gameState.shotInProgress]);


    // Helper to sync bodies
    const updateBallsFromState = (serverBalls: any[]) => {
        const world = engineRef.current!.world;
        const currentBodies = ballsRef.current;

        serverBalls.forEach((b: any) => {
            let body = currentBodies[b.id];

            // Texture/Color map
            let color = '#fff';
            if (b.type === 'SOLID') color = '#f1c40f'; // Yellow
            if (b.type === 'STRIPE') color = '#3498db'; // Blue
            if (b.type === 'EIGHT') color = '#000000';
            if (b.type === 'CUE') color = '#fff';
            if (b.type === 'SOLID' && b.id === 2) color = '#d32f2f'; // Red

            if (!body) {
                body = Matter.Bodies.circle(b.x, b.y, BALL_RADIUS, {
                    restitution: 0.9, // Bounciness
                    friction: 0.005,  // Friction with cloth
                    frictionAir: 0.02, // Air resistance (simulates drag)
                    label: `ball_${b.id}`,
                    render: { fillStyle: color, strokeStyle: '#000', lineWidth: 1 }
                });
                Matter.World.add(world, body);
                currentBodies[b.id] = body;
            } else {
                // If not sleeping or moving fast, sync position
                Matter.Body.setPosition(body, { x: b.x, y: b.y });
                Matter.Body.setVelocity(body, { x: 0, y: 0 }); // Reset momentum on sync
                Matter.Body.setAngularVelocity(body, 0);
            }
        });

        // Remove missing balls (pocketed)
        Object.keys(currentBodies).forEach(idStr => {
            const id = parseInt(idStr);
            if (!serverBalls.find((sb: any) => sb.id === id)) {
                Matter.World.remove(world, currentBodies[id]);
                delete currentBodies[id];
            }
        });
    };

    // --- Input Handling ---
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!myTurn || gameState.shotInProgress || winner) return;

        const rect = sceneRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if clicked near cue ball
        const cueBall = ballsRef.current[0];
        if (!cueBall) return;

        const dist = Math.hypot(x - cueBall.position.x, y - cueBall.position.y);
        if (dist < 50) { // Increased hit area for easier grabbing
            setCueData({
                start: { x: cueBall.position.x, y: cueBall.position.y },
                current: { x, y }
            });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = sceneRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setMousePos({ x, y });

        if (cueData) {
            setCueData(prev => prev ? { ...prev, current: { x, y } } : null);
        }
    };

    const handleMouseUp = () => {
        if (!cueData) return;

        const dx = cueData.start.x - cueData.current.x;
        const dy = cueData.start.y - cueData.current.y;

        // Power limit
        const rawPower = Math.hypot(dx, dy);
        const MAX_POWER = 200;
        const power = Math.min(rawPower, MAX_POWER) * 0.05; // Tuned Force

        if (power > 2) {
            // Apply Force Locally
            const angle = Math.atan2(dy, dx);
            isSimulating.current = true; // LOCK SYNC
            applyForceToCue(angle, power);

            // Emit to Server
            socket.emit("play_move", {
                gameId,
                move: { action: "SHOT_START", angle, force: power, playerId } // Include playerId? Already in wrapper?
            });

            // Start checking for stop
            startTurnWait();
        }

        setCueData(null);
    };

    const applyForceToCue = (angle: number, force: number) => {
        const cueBall = ballsRef.current[0];
        if (!cueBall) return;

        const forceVector = {
            x: Math.cos(angle) * force,
            y: Math.sin(angle) * force
        };
        Matter.Body.setStatic(cueBall, false); // Ensure dynamic
        Matter.Sleeping.set(cueBall, false); // Wake up
        Matter.Body.applyForce(cueBall, cueBall.position, forceVector);
    };

    // --- Simulation Loop & Sync ---
    useEffect(() => {
        socket.on("pool_shot", (data: { angle: number, force: number, playerId: string }) => {
            if (data.playerId !== playerId) {
                // LOCK SYNC immediately to prevent state update from clobbering velocity
                isSimulating.current = true;
                applyForceToCue(data.angle, data.force);
            }
        });

        return () => { socket.off("pool_shot"); };
    }, [socket, playerId]);


    const startTurnWait = () => {
        // Poll physics until all slept
        const checkInterval = setInterval(() => {
            const bodies = Object.values(ballsRef.current);
            const allStopped = bodies.every(b => b.speed < 0.1);

            if (allStopped) {
                clearInterval(checkInterval);
                finishTurn();
            }
        }, 500);
    };

    const finishTurn = () => {
        const pockets = [
            { x: 0, y: 0 }, { x: WIDTH / 2, y: 0 }, { x: WIDTH, y: 0 },
            { x: 0, y: HEIGHT }, { x: WIDTH / 2, y: HEIGHT }, { x: WIDTH, y: HEIGHT }
        ];

        const finalBalls: any[] = [];
        const sunkIds: number[] = [];
        const bodies = ballsRef.current;

        Object.keys(bodies).forEach(key => {
            const id = parseInt(key);
            const b = bodies[id];
            let sunk = false;

            pockets.forEach(p => {
                if (Math.hypot(b.position.x - p.x, b.position.y - p.y) < 20) { // Pocket Radius
                    sunk = true;
                }
            });

            if (sunk) {
                sunkIds.push(id);
                // Don't add to finalBalls
            } else {
                finalBalls.push({ id, type: getBallType(id), x: b.position.x, y: b.position.y });
            }
        });

        // Send Result
        socket.emit("play_move", {
            gameId,
            move: {
                action: "SHOT_END",
                playerId,
                finalBalls,
                sunkBallIds: sunkIds
            }
        });

        // Wait a bit before unlocking sync to allow server to process SHOT_END
        setTimeout(() => {
            isSimulating.current = false;
        }, 500);
    };

    const getBallType = (id: number) => {
        if (id === 0) return 'CUE';
        if (id === 8) return 'EIGHT';
        if (id < 8) return 'SOLID';
        return 'STRIPE';
    };

    const renderCueStick = () => {
        if (!myTurn || gameState.shotInProgress || winner || !mousePos) return null;

        const cueBall = ballsRef.current[0];
        if (!cueBall) return null;

        const cueBallX = cueBall.position.x;
        const cueBallY = cueBall.position.y;

        // Calculate angle from cue ball to mouse position
        const angle = Math.atan2(mousePos.y - cueBallY, mousePos.x - cueBallX);
        const rotation = angle * 180 / Math.PI; // Convert radians to degrees

        const stickLength = 300;
        const stickWidth = 6;

        // Position the stick's "tip" (the end closer to the cue ball) slightly behind the cue ball
        const tipOffset = BALL_RADIUS + 10;
        const stickStartX = cueBallX - Math.cos(angle) * tipOffset;
        const stickStartY = cueBallY - Math.sin(angle) * tipOffset;

        return (
            <div
                className="absolute bg-amber-800 border-2 border-amber-900 rounded shadow-lg pointer-events-none"
                style={{
                    width: stickLength,
                    height: stickWidth,
                    top: stickStartY - stickWidth / 2,
                    left: stickStartX,
                    transform: `rotate(${rotation}deg)`,
                    transformOrigin: '0% 50%' // Rotate around left tip
                }}
            >
                {/* Visual Tip */}
                <div className="absolute left-0 top-0 h-full w-2 bg-blue-300"></div>
            </div>
        );
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
            {/* Header matches other games */}
            <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center text-sm text-slate-500 font-mono">
                <div>SALA: {gameId}</div>
                <div>JUGADOR: {playerId.slice(0, 6)}...</div>
            </div>

            <h1 className="text-4xl md:text-5xl font-black mb-8 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500 drop-shadow-lg">
                8 BALL POOL
            </h1>

            <div className="relative shadow-2xl border-8 border-yellow-900 rounded-lg bg-green-900">
                <div
                    ref={sceneRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    className="cursor-crosshair"
                />

                {renderCueStick()}

                {/* Drag Line and Trajectory */}
                {cueData && (() => {
                    const dx = cueData.start.x - cueData.current.x;
                    const dy = cueData.start.y - cueData.current.y;
                    // const length = Math.hypot(dx, dy); // Unused
                    // Forward Trajectory (Opposite to drag)
                    // Extend line by 500px
                    const angle = Math.atan2(dy, dx);
                    const tx = cueData.start.x + Math.cos(angle) * 800;
                    const ty = cueData.start.y + Math.sin(angle) * 800;

                    return (
                        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
                            {/* Pull line (White) */}
                            <line
                                x1={cueData.start.x} y1={cueData.start.y}
                                x2={cueData.current.x} y2={cueData.current.y}
                                stroke="white"
                                strokeWidth="2"
                                strokeDasharray="5 5"
                                opacity="0.5"
                            />
                            {/* Trajectory line (Yellow) */}
                            <line
                                x1={cueData.start.x} y1={cueData.start.y}
                                x2={tx} y2={ty}
                                stroke="#facc15"
                                strokeWidth="3"
                                strokeDasharray="10 10"
                                opacity="0.8"
                            />
                        </svg>
                    );
                })()}
            </div>

            {/* Status Panel */}
            <div className="mt-6 flex gap-8 text-xl font-bold">
                <div className={myTurn ? "text-green-400 animate-pulse" : "text-slate-600"}>
                    {myTurn ? "TU TURNO" : (gameState.currentPlayer ? "TURNO DEL RIVAL" : "ESPERANDO RIVAL...")}
                </div>
                <div className="text-xs text-slate-500">
                    Yo: {playerId.slice(0, 4)} | Actual: {gameState.currentPlayer?.slice(0, 4) || "Nadie"} | Bolas: {gameState.balls?.length || 0}
                </div>
            </div>

            {winner && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-800 p-8 rounded-2xl border border-white/10 text-center">
                        <h2 className="text-4xl font-black mb-4">
                            {winner === playerId ? "¡GANASTE!" : "PERDISTE"}
                        </h2>
                        <button
                            onClick={() => socket.emit("play_move", { gameId, move: { action: "RESET" } })}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full font-bold"
                        >
                            Jugar de Nuevo
                        </button>
                    </div>
                </div>
            )}
            <ChatBox socket={socket} gameId={gameId} myPlayerId={playerId} />
        </div >
    );
};
