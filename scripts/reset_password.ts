
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const TARGET_USER = "electro savage";
const NEW_PASS = "123456";

async function main() {
    // 1. Find User
    const user = await prisma.user.findFirst({
        where: { username: { equals: TARGET_USER, mode: 'insensitive' } }
    });

    if (!user) {
        console.log(`❌ No encontré al usuario "${TARGET_USER}"`);
        return;
    }

    console.log(`👤 Usuario encontrado: ${user.username}`);
    console.log(`📧 Email: ${user.email}`);

    // 2. Hash new password
    const hash = await bcrypt.hash(NEW_PASS, 10);

    // 3. Update User
    await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hash }
    });

    console.log(`🔑 Contraseña restablecida a: "${NEW_PASS}"`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
