// src/routes/auth.ts
import { FastifyInstance } from "fastify";
import { loginCtrl, meCtrl, registerCtrl } from "../controllers/auth.controller";
import { requireAuth } from "../Plugin/requireAuth";
import { z } from "zod";
import { ZodTypeProvider } from "fastify-type-provider-zod";

export default async function authRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  // Schema Definitions
  const registerSchema = z.object({
    username: z.string().min(3).max(20),
    email: z.string().email(),
    password: z.string().min(6)
  });

  const loginSchema = z.object({
    emailOrUsername: z.string().min(1),
    password: z.string().min(1)
  });

  // Auth pública
  server.post("/api/auth/register", {
    schema: {
      body: registerSchema
    }
  }, registerCtrl);

  server.post("/api/auth/login", {
    schema: {
      body: loginSchema
    }
  }, loginCtrl);

  // /me protegida por JWT
  server.get("/api/auth/me", { preHandler: [requireAuth] }, meCtrl);

  // (opcional) ruta de prueba protegida
  server.get(
    "/api/profile",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      // simplemente devuelve lo mismo que /me
      return meCtrl(req, reply);
    }
  );

  server.get("/api/debug-db", async (req, reply) => {
    try {
      // Test DB connection
      const userCount = await require("../lib/prisma").prisma.user.count();
      return reply.send({
        status: "ok",
        message: "DB Connected",
        userCount,
        env: {
          DATABASE_URL: !!process.env.DATABASE_URL,
          JWT_SECRET: !!process.env.JWT_SECRET,
          NODE_ENV: process.env.NODE_ENV
        }
      });
    } catch (error: any) {
      return reply.status(500).send({
        status: "error",
        message: "DB Connection Failed",
        error: error.message,
        stack: error.stack
      });
    }
  });
}
