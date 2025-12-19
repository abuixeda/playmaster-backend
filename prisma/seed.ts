// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const defs = [
    {
      code: 'TRUCO',
      name: 'Truco',
      minPlayers: 2,
      maxPlayers: 2,
      rules: { winBy: 'score', target: 30 },
      isActive: true,
      version: 1,
    },
    {
      code: 'POOL',
      name: 'Pool 1v1',
      minPlayers: 2,
      maxPlayers: 2,
      rules: { variant: '8-ball' },
      isActive: true,
      version: 1,
    },
    // agregá más si querés (UNO, AJEDREZ, etc.)
  ];

  for (const d of defs) {
    await prisma.gameDefinition.upsert({
      where: { code: d.code },
      update: {
        name: d.name,
        minPlayers: d.minPlayers,
        maxPlayers: d.maxPlayers,
        rules: d.rules as any,
        isActive: d.isActive,
        version: d.version,
      },
      create: d as any,
    });
  }

  console.log('✔ GameDefinitions seeded');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
