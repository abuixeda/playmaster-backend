
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TARGETS = [
    "El dylan de varela",  // From Screenshot
    "eldylandevarela",     // From Chat
    "amulak",
    "electro savage",
    "electro_savage"       // Possible variation
];

const AMOUNT = 10000;

async function main() {
    console.log("💰 Iniciando carga INTELIGENTE...");

    for (const name of TARGETS) {
        // Try exact first, then insensitive
        let user = await prisma.user.findFirst({
            where: {
                username: { equals: name, mode: 'insensitive' }
            }
        });

        if (!user) {
            console.log(`❌ No encontrado: '${name}'`);
            continue;
        }

        console.log(`✅ ENCONTRADO: '${user.username}' (ID: ${user.id})`);

        // Upsert Wallet
        const wallet = await prisma.wallet.upsert({
            where: { userId: user.id },
            create: { userId: user.id, balance: AMOUNT },
            update: { balance: { increment: AMOUNT } }
        });

        console.log(`   💸 Nuevo Balance: $${wallet.balance}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
