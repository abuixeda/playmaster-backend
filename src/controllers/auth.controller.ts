// src/controllers/auth.controller.ts 
import { FastifyRequest, FastifyReply } from "fastify";
import { UserRepository } from "../repositories/UserRepository";
import bcrypt from "bcryptjs";
import { signToken, verifyToken, JWTPayload } from "../lib/jwt";

// Tipos simples
type RegisterBody = { username: string; email: string; password: string };
type LoginBody = { emailOrUsername: string; password: string };

// ---------- REGISTER ----------
export async function registerCtrl(
  req: FastifyRequest<{ Body: RegisterBody }>,
  reply: FastifyReply
) {
  try {
    const { username, email, password } = req.body;

    // Check existence
    const existingEmail = await UserRepository.findByEmail(email);
    if (existingEmail) return reply.status(400).send({ error: "El email ya está en uso" });

    const existingUser = await UserRepository.findByUsername(username);
    if (existingUser) return reply.status(400).send({ error: "El nombre de usuario ya está en uso" });

    const hash = await bcrypt.hash(password, 10);
    const user = await UserRepository.create(email, username, hash);

    const token = signToken({ id: user.id } as JWTPayload);

    return reply.status(201).send({
      message: "Usuario registrado",
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (error: any) {
    console.error("[AUTH REGISTER ERROR]", error);
    return reply.status(500).send({ error: "Error interno al registrar usuario", details: error.message });
  }
}

// ---------- LOGIN ----------
export async function loginCtrl(
  req: FastifyRequest<{ Body: LoginBody }>,
  reply: FastifyReply
) {
  try {
    const { emailOrUsername, password } = req.body;
    console.log(`[AUTH] Login attempt for: ${emailOrUsername}`);

    const user = await UserRepository.findByEmailOrUsername(emailOrUsername);

    if (!user || !user.passwordHash) {
      console.warn(`[AUTH] User not found or no password hash for: ${emailOrUsername}`);
      return reply.status(401).send({ error: "Credenciales inválidas" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      console.warn(`[AUTH] Invalid password for: ${emailOrUsername}`);
      return reply.status(401).send({ error: "Credenciales inválidas" });
    }

    const token = signToken({ id: user.id } as JWTPayload);

    return reply.send({
      message: "Login exitoso",
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error: any) {
    console.error("[AUTH LOGIN ERROR]", error); // Esto saldrá en los logs de Railway
    // Devolvemos el detalle del error para que lo veas en el navegador (solo para debug)
    return reply.status(500).send({
      error: "Error interno al iniciar sesión",
      details: error.message
    });
  }
}

// ---------- ME ----------
export async function meCtrl(req: FastifyRequest, reply: FastifyReply) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Token no proporcionado" });
  }

  try {
    const token = auth.split(" ")[1];
    const decoded = verifyToken<JWTPayload>(token);

    const me = await UserRepository.findById(decoded.id as string);

    if (!me) {
      return reply.status(404).send({ error: "Usuario no encontrado" });
    }

    const { passwordHash, ...cleanUser } = me;
    return reply.send(cleanUser);
  } catch (error) {
    return reply.status(401).send({ error: "Token inválido o expirado" });
  }
}

