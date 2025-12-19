import { prisma } from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
    let output = "";
    output += "--- LATEST USERS ---\n";
    const users = await prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { wallet: true }
    });
    output += JSON.stringify(users, null, 2) + "\n\n";

    output += "--- LATEST GAMES ---\n";
    const games = await prisma.game.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { players: true }
    });
    output += JSON.stringify(games, null, 2) + "\n";

    const outPath = path.join(__dirname, 'latest_data_output.txt');
    fs.writeFileSync(outPath, output);
    console.log(`Data written to ${outPath}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
