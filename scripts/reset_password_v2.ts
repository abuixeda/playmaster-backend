
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const PASSPHRASE = "123456";

async function main() {
    // Search loosely
    const users = await prisma.user.findMany({
        where: { username: { contains: 'lectro', mode: 'insensitive' } }
    });

    if (users.length === 0) {
        console.log("❌ Sigo sin encontrar nadie parecido a 'electro'...");
        return;
    }

    if (users.length > 1) {
        console.log("⚠️ Encontré varios, no sé cual tocar:");
        users.forEach(u => console.log(` - ${u.username} (${u.email})`));
        return;
    }

    const targetUser = users[0];
    console.log(`🎯 Objetivo Localizado: "${targetUser.username}"`);
    console.log(`📧 Email actual: ${targetUser.email}`);

    const hash = await bcrypt.hash(PASSPHRASE, 10);

    await prisma.user.update({
        where: { id: targetUser.id },
        data: { passwordHash: hash }
    });

    console.log(`✅ Contraseña cambiada a: ${PASSPHRASE}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
