// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

// Evita múltiples instancias en dev con hot-reload
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"], // opcional: ["query","info","warn","error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma; // <-- export default
