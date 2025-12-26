
import Fastify from "fastify";
import authRoutes from "../src/routes/auth";
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    const server = Fastify();

    // Register the routes
    // We need to verify if registration requires other plugins, but looking at auth.ts it seems self-contained enough for this test
    // aside from requireAuth but that's only for /me
    // Register Zod compilers
    server.setValidatorCompiler(require("fastify-type-provider-zod").validatorCompiler);
    server.setSerializerCompiler(require("fastify-type-provider-zod").serializerCompiler);

    await server.register(authRoutes);

    const response = await server.inject({
        method: 'GET',
        url: '/api/debug-db'
    });

    console.log("Status Code:", response.statusCode);
    console.log("Body:", response.body);
}

main().catch(console.error);
