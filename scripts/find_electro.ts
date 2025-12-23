
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("🔍 Buscando usuarios con 'electro'...");
    const users = await prisma.user.findMany({
        where: {
            username: { contains: 'lectro', mode: 'insensitive' }
        }
    });

    if (users.length === 0) {
        console.log("❌ No se encontraron usuarios con 'electro'");
    } else {
        users.forEach(u => console.log(`👉 ENCONTRADO: "${u.username}" (ID: ${u.id}) - Saldo: $${u.wallet?.balance || 0}`));
    }
}

main().finally(() => prisma.$disconnect());
