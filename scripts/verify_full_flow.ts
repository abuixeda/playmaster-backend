
import { PrismaClient } from '@prisma/client';
import { GameService } from '../src/services/GameService'; // Importing Service
import { GameRepository } from '../src/repositories/GameRepository';

const prisma = new PrismaClient();
const U1_KEY = "electro";
const U2_KEY = "dylan"; // Keyword for search

async function main() {
    console.log("🛠️ Iniciando Simulación de Match Backend...");

    // 1. Get Users
    const u1 = await prisma.user.findFirst({ where: { username: { contains: U1_KEY, mode: 'insensitive' } }, include: { wallet: true } });
    const u2 = await prisma.user.findFirst({ where: { username: { contains: U2_KEY, mode: 'insensitive' } }, include: { wallet: true } });

    if (!u1 || !u2) {
        console.error("❌ No encontré a los usuarios.");
        return;
    }

    console.log(`P1: ${u1.username} ($${u1.wallet?.balance})`);
    console.log(`P2: ${u2.username} ($${u2.wallet?.balance})`);

    const GAME_ID = "DEBUG_MATCH_" + Date.now();
    const AMOUNT = 500;

    // 2. Create Game Stub
    console.log(`\nCreating Game ${GAME_ID} (RPS)...`);
    await GameRepository.createWithId(GAME_ID, "RPS");

    // 3. Lock Bets
    console.log(`Locking $${AMOUNT}...`);
    const success = await GameService.createMatchBets(GAME_ID, u1.id, u2.id, AMOUNT);

    if (success) {
        console.log("✅ APUESTAS EXITOSAS. El sistema funciona.");

        // Verify DB
        const bets = await prisma.betLock.findMany({ where: { gameId: GAME_ID } });
        console.log(`Bets in DB: ${bets.length}`);

        // Confirm Balances Reduced
        const u1After = await prisma.wallet.findUnique({ where: { userId: u1.id } });
        const u2After = await prisma.wallet.findUnique({ where: { userId: u2.id } });
        console.log(`P1 Final: $${u1After?.balance}`);
        console.log(`P2 Final: $${u2After?.balance}`);

        // Refund to clean up
        console.log("Refunding...");
        await GameService.finishGame(GAME_ID, "TIE");
    } else {
        console.error("❌ FALLÓ EL BLOQUEO DE FONDOS. Revisa logs de GameService.");
    }
}

main().finally(() => prisma.$disconnect());
