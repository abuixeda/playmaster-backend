import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    user?: { id: string };
  }
}
import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    user?: { id: string };
  }
}
