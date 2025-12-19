import * as jwt from "jsonwebtoken";

const JWT_SECRET: string = process.env.JWT_SECRET ?? "dev-secret-change-me";
export type JWTPayload = { id: string } & Record<string, unknown>;

export function signToken(payload: JWTPayload, expiresIn: string | number = "7d"): string {
  return (jwt as any).sign(payload, JWT_SECRET, { expiresIn }) as string;
}

export function verifyToken<T = any>(token: string): T {
  return (jwt as any).verify(token, JWT_SECRET) as T;
}

export function getUserId(token: string): string {
  const decoded = verifyToken<JWTPayload>(token);
  return decoded.id as string;
}

