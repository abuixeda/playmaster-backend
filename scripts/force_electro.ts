
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const USERNAME = "electro savage";
const EMAIL = "electro@test.com"; // Default for local dev
const PASS = "123456";

async function main() {
    const hash = await bcrypt.hash(PASS, 10);

    // 1. Try to find by username
    let user = await prisma.user.findFirst({
        where: { username: { equals: USERNAME, mode: 'insensitive' } }
    });

    if (user) {
        console.log(`✅ Usuario existente encontrado: ${user.username}`);
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: hash }
        });
        console.log(`🔄 Contraseña actualizada.`);
    } else {
        console.log(`🆕 Usuario no encontrado. Creándolo...`);
        try {
            user = await prisma.user.create({
                data: {
                    username: USERNAME,
                    email: EMAIL,
                    passwordHash: hash,
                    wallet: { create: { balance: 20000 } } // Give him money directly
                }
            });
            console.log(`✨ Usuario creado con éxito!`);
        } catch (e) {
            // Fallback if email taken but username different?
            console.error("Error creando usuario (quizas email ocupado?):", e.message);
        }
    }

    if (user) {
        console.log(`\n--- CREDENTIALS ---`);
        console.log(`User: ${user.username}`);
        console.log(`Email: ${user.email}`);
        console.log(`Pass: ${PASS}`);
        console.log(`-------------------`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
