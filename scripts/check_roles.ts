
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    console.log("Users and Roles:");
    users.forEach(u => {
        console.log(`- [${u.id}] ${u.username} (${u.email}) -> ROLE: ${u.role}`);
    });

    if (users.length > 0) {
        const userToPromote = users[0];
        console.log(`\nPromoting ${userToPromote.username} to ADMIN...`);
        await prisma.user.update({
            where: { id: userToPromote.id },
            data: { role: 'ADMIN' }
        });
        console.log("Done! User is now ADMIN.");
    } else {
        console.log("No users found to promote.");
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
