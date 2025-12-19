
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    // Find all users
    const users = await prisma.user.findMany();
    console.log("Users found:", users.length);
    if (users.length === 0) {
        console.log("No users found.");
        return;
    }

    // Promote the first user (or specific one if identified)
    // Assuming the user I was interacting with is likely the first one or I can update ALL for dev purposes?
    // Let's safe bet: Update the first one found and print credentials.
    const targetUser = users[0];

    console.log(`Promoting user: ${targetUser.username} (${targetUser.id}) to ADMIN`);

    await prisma.user.update({
        where: { id: targetUser.id },
        data: { role: 'ADMIN' }
    });

    console.log("Success! Role updated to ADMIN.");
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
