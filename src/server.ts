import Fastify from "fastify";
import authRoutes from "./routes/auth";
import gamesRoutes from "./routes/games";
import walletRoutes from "./routes/wallet";
import webhookRoutes from "./routes/webhooks";
import userRoutes from "./routes/user";
import { adminRoutes } from "./routes/admin"; // Added import for admin routes

import rankingRoutes from "./routes/ranking";
import { SocketServer } from "./services/socket/SocketServer";
import cors from "@fastify/cors";
import { verifyToken } from "./lib/jwt";


console.log("[DEBUG] Server module loaded");

export async function start() {
  console.log("[DEBUG] start() called");
  const app = Fastify();

  // Configure CORS for Fastify (MUST BE FIRST)
  await app.register(cors, {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  });

  // Health Check
  app.get("/health", async () => ({ status: "ok" }));
  app.get("/", async () => ({ status: "Playmaster Backend Running", service: "API" }));

  // Rutas
  await app.register(rankingRoutes);
  await app.register(authRoutes);
  await app.register(gamesRoutes);
  await app.register(walletRoutes);
  await app.register(webhookRoutes);
  await app.register(userRoutes);
  await app.register(adminRoutes, { prefix: "/api/admin" }); // Registered admin routes

  // JWT Middleware
  app.addHook("onRequest", async (request, reply) => {
    try {
      if (request.url.startsWith('/api')) {
        console.log(`[REQ] ${request.method} ${request.url} | Auth: ${!!request.headers.authorization}`);
      }
      const token = request.headers.authorization?.replace("Bearer ", "");
      if (token) {
        const decoded = verifyToken(token);
        (request as any).user = decoded;
      }
    } catch (err) { }
  });

  // Initialize Socket Server
  console.log("[DEBUG] Initializing SocketServer...");
  try {
    new SocketServer(app.server);
    console.log(`🔌 Socket Server initialized`);
  } catch (err: any) {
    console.error("[DEBUG] SocketServer init failed:", err);
    throw err;
  }

  const PORT = Number(process.env.PORT) || 4001;

  try {
    console.log(`[DEBUG] Attempting to listen on ${PORT}...`);
    await app.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`🚀 Servidor corriendo en http://0.0.0.0:${PORT}`);
  } catch (err: any) {
    console.warn("⚠️ Error al iniciar servidor (Ignorado):", err.message);
  }
}



// End of file. Start logic moved to boot.ts

