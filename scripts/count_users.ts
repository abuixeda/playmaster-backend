
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
    const count = await prisma.user.count();
    console.log(`User Count: ${count}`);
    const users = await prisma.user.findMany({ select: { username: true, wallet: { select: { balance: true } } } });
    console.log(JSON.stringify(users, null, 2));
}
main();
