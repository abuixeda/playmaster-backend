
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const USERNAME_FILTERS = [
    "eldylandevarela",
    "amulak",
    "electro savage"
];

async function main() {
    console.log("🔍 Verificando saldos en Base de Datos...");

    const users = await prisma.user.findMany({
        where: {
            username: { in: USERNAME_FILTERS, mode: 'insensitive' }
        },
        include: {
            wallet: true
        }
    });

    console.log(`Encontrados: ${users.length} usuarios.`);

    for (const u of users) {
        console.log(`👤 User: ${u.username}`);
        console.log(`   💰 Wallet Balance: $${u.wallet?.balance ?? 'NO WALLET'}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
