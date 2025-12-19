// src/routes/auth.ts
import { FastifyInstance } from "fastify";
import { loginCtrl, meCtrl, registerCtrl } from "../controllers/auth.controller";
import { requireAuth } from "../Plugin/requireAuth";

export default async function authRoutes(app: FastifyInstance) {
  // Auth pública
  app.post("/api/auth/register", registerCtrl);
  app.post("/api/auth/login", loginCtrl);

  // /me protegida por JWT
  app.get("/api/auth/me", { preHandler: [requireAuth] }, meCtrl);

  // (opcional) ruta de prueba protegida
  app.get(
    "/api/profile",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      // simplemente devuelve lo mismo que /me
      return meCtrl(req, reply);
    }
  );
}
