
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const PASSPHRASE = "123456";
const USERNAME = "amulak";

async function main() {
    console.log(`Searching for user: ${USERNAME}`);
    const user = await prisma.user.findFirst({
        where: { username: { equals: USERNAME, mode: 'insensitive' } }
    });

    if (!user) {
        console.log(`❌ User '${USERNAME}' not found.`);
        return;
    }

    console.log(`🎯 Found user: "${user.username}" (${user.email})`);

    const hash = await bcrypt.hash(PASSPHRASE, 10);

    await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hash }
    });

    console.log(`✅ Password for ${user.username} reset to: ${PASSPHRASE}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
