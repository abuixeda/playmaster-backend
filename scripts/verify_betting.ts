
import { io } from "socket.io-client";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

const URL = "http://localhost:3001";
const PREFIX = "BET_TEST_" + Math.floor(Math.random() * 1000);

async function main() {
    console.log(`Starting Betting Verification (${PREFIX})...`);

    // 1. Create Users & Wallets
    const p1 = await createUser(`${PREFIX}_P1`, 1000);
    const p2 = await createUser(`${PREFIX}_P2`, 1000);
    console.log(`Created Users: ${p1.username} ($1000) vs ${p2.username} ($1000)`);

    // 2. Create Game
    const gameId = (Math.random().toString(36).substring(2, 8) + "BET").toUpperCase();
    const game = await prisma.game.create({
        data: {
            id: gameId,
            typeCode: "RPS",
            status: "WAITING",
            gameState: {}
        }
    });

    // 3. Place Bets (Manually creating BetLocks)
    // Assume each bets $100 on themselves
    await createBet(p1.id, game.id, 100, p1.id);
    await createBet(p2.id, game.id, 100, p2.id);
    console.log("Bets placed: $100 each.");

    // 4. Play Game (P1 Wins)
    const socket1 = io(URL);
    const socket2 = io(URL);

    // Join
    socket1.emit("join_game", { gameId, playerId: p1.id, gameType: "RPS" });
    socket2.emit("join_game", { gameId, playerId: p2.id, gameType: "RPS" });
    await sleep(1000);

    // Round 1: P1 (Rock) vs P2 (Scissors) -> P1 Wins
    console.log("Playing Round...");
    socket1.emit("play_move", { gameId, move: { playerId: p1.id, action: "PLAY", choice: "ROCK" } });
    socket2.emit("play_move", { gameId, move: { playerId: p2.id, action: "PLAY", choice: "SCISSORS" } });
    await sleep(2000);

    // Reset Round
    console.log("Resetting Round...");
    socket1.emit("play_move", { gameId, move: { playerId: p1.id, action: "RESET" } });
    await sleep(1000);

    // Round 2: P1 (Rock) vs P2 (Scissors) -> P1 Wins Match (2-0)
    console.log("Playing Round 2...");
    socket1.emit("play_move", { gameId, move: { playerId: p1.id, action: "PLAY", choice: "ROCK" } });
    socket2.emit("play_move", { gameId, move: { playerId: p2.id, action: "PLAY", choice: "SCISSORS" } });
    await sleep(5000); // Give time for db transaction

    // 5. Verify Payout
    console.log("Verifying Wallets...");
    const w1 = await prisma.wallet.findUnique({ where: { userId: p1.id } });
    const w2 = await prisma.wallet.findUnique({ where: { userId: p2.id } });

    // Debug DB State
    const finalGame = await prisma.game.findUnique({ where: { id: gameId } });
    const finalBets = await prisma.betLock.findMany({ where: { gameId } });
    console.log("Final Game Status:", finalGame?.status);
    console.log("Final Game State Winner:", (finalGame?.gameState as any)?.winner);
    console.log("Final Bets Status:", finalBets.map(b => `${b.userId}: ${b.status} (on ${b.onPlayerId})`));

    console.log(`${p1.username} Balance: $${w1?.balance} (Expected ~$1200 if 2x payout, or $1100 if 1:1 profit)`);
    console.log(`${p2.username} Balance: $${w2?.balance} (Expected $900?)`);

    // Note: The logic in GameService currently strictly checks if balance was deducted. 
    // In this script we manually created BetLocks but didn't deduct initial balance.
    // So P1 starts with 1000, and should get +200 (if 100 bet * 2). Total 1200.
    // P2 starts with 1000, lost 100 bet (which wasn't deducted here, but BetLock says pending). 
    // P2 should remain 1000 (since we mocked the Lock without deduction) OR logic consumes lock.
    // Wait, the Logic reads lock 'amount'. Updates Wallet with 'increment: amount * 2'.
    // So P1 should ideally have 1000 + 200 = 1200.

    if (w1!.balance > 1000) {
        console.log("SUCCESS: Winner paid out!");
    } else {
        console.error("FAIL: Winner balance did not increase.");
    }

    socket1.disconnect();
    socket2.disconnect();
}

async function createUser(username: string, balance: number) {
    const user = await prisma.user.create({
        data: {
            username,
            email: `${username}@test.com`,
            passwordHash: "hash"
        }
    });
    await prisma.wallet.create({
        data: {
            userId: user.id,
            balance: balance
        }
    });
    return user;
}

async function createBet(userId: string, gameId: string, amount: number, onPlayerId: string) {
    return prisma.betLock.create({
        data: {
            userId,
            gameId,
            amount,
            onPlayerId,
            status: "PENDING"
        }
    });
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(console.error).finally(() => prisma.$disconnect());
