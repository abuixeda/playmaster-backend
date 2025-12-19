
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- DB TEST START ---');

    // 1. Create User
    const email = `test_${Date.now()}@example.com`;
    const user = await prisma.user.create({
        data: {
            email,
            username: `user_${Date.now()}`,
            passwordHash: 'hashed_secret', // Simplified
            wallet: {
                create: {
                    balance: 1000
                }
            }
        },
        include: { wallet: true }
    });
    console.log('User created:', user.id, user.username);
    console.log('Wallet balance:', user.wallet?.balance);

    // 2. Create Game Definition
    const gameDef = await prisma.gameDefinition.upsert({
        where: { code: 'TRUCO' },
        update: {},
        create: {
            code: 'TRUCO',
            name: 'Truco Argentino',
            minPlayers: 2,
            maxPlayers: 4
        }
    });
    console.log('Game Def ensured:', gameDef.code);

    // 3. Create Game Instance
    const game = await prisma.game.create({
        data: {
            typeCode: 'TRUCO',
            status: 'WAITING',
            gameState: { round: 1, currentTurn: 0 }
        }
    });
    console.log('Game instance created:', game.id);

    // 4. Join User to Game
    const player = await prisma.gamePlayer.create({
        data: {
            gameId: game.id,
            userId: user.id
        }
    });
    console.log('User joined game:', player.id);

    // 5. Place a Bet (Lock funds)
    const bet = await prisma.betLock.create({
        data: {
            gameId: game.id,
            userId: user.id,
            onPlayerId: player.id,
            amount: 100,
            status: 'LOCKED'
        }
    });
    console.log('Bet placed:', bet.id, 'Amount:', bet.amount);

    // 6. Verify Ledger Entry (Manual for now, typically handled by service)
    const ledger = await prisma.walletLedger.create({
        data: {
            walletId: user.wallet!.id,
            userId: user.id,
            amount: -100,
            type: 'BET'
        }
    });
    console.log('Ledger entry created:', ledger.id);

    console.log('--- DB TEST SUCCESS ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
