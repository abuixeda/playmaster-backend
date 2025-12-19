import { FastifyRequest, FastifyReply } from "fastify";
import { verifyToken, JWTPayload } from "../lib/jwt";

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.status(401).send({ error: "Falta token de autenticación" });
    }

    const token = authHeader.substring("Bearer ".length).trim();

    // Uses centralized verifyToken which handles secret and typing
    const decoded = verifyToken<JWTPayload>(token);

    request.user = { id: decoded.id };
  } catch (err) {
    console.error("Error verificando token:", err);
    return reply.status(401).send({ error: "Token inválido o expirado" });
  }
}
