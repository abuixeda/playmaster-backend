import prisma from '../src/lib/prisma';

async function main() {
    const username = 'amulak';
    const user = await prisma.user.findUnique({
        where: { username },
        include: { wallet: true, bets: { orderBy: { createdAt: 'desc' }, take: 5 } }
    });

    console.log("User:", user?.username);
    console.log("Wallet Balance:", user?.wallet?.balance);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
