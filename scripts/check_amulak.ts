
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { username: "amulak" }
    });
    console.log("User amulak:", user);

    if (user && user.role !== 'ADMIN') {
        console.log("Promoting amulak to ADMIN...");
        await prisma.user.update({
            where: { id: user.id },
            data: { role: 'ADMIN' }
        });
        console.log("Done.");
    }
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
