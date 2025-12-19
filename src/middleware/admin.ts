import { FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function adminMiddleware(req: FastifyRequest, reply: FastifyReply) {
    try {
        console.log(`AdminMiddleware: ${req.method} ${req.url}`);
        if (req.method === 'OPTIONS') return;

        const user = (req as any).user;
        if (!user || !user.id) {
            console.log("AdminMiddleware: No user attached to request");
            return reply.status(401).send({ message: "Unauthorized" });
        }

        // Fetch fresh user to check role
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id }
        });

        console.log(`AdminMiddleware Check: ${user.id} -> Role: ${dbUser?.role}`);

        if (!dbUser || dbUser.role !== 'ADMIN') {
            console.log("AdminMiddleware: Access Denied (Not ADMIN)");
            return reply.status(403).send({ message: "Forbidden: Admins only" });
        }
    } catch (e) {
        console.error("Admin Auth Error:", e);
        return reply.status(500).send({ message: "Internal Server Error" });
    }
}
