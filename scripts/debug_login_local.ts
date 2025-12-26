
import { UserRepository } from "../src/repositories/UserRepository";
import { signToken } from "../src/lib/jwt";
import bcrypt from "bcryptjs";
import dotenv from 'dotenv';
dotenv.config();

console.log("Checking environment...");
console.log("DATABASE_URL present:", !!process.env.DATABASE_URL);
console.log("JWT_SECRET present:", !!process.env.JWT_SECRET);

async function testLogin(username, password) {
    console.log(`\nAttempting login for: ${username}`);
    try {
        const user = await UserRepository.findByEmailOrUsername(username);

        if (!user) {
            console.log("❌ User not found");
            return;
        }
        console.log("✅ User found:", user.username, user.email);

        if (!user.passwordHash) {
            console.log("❌ No password hash set");
            return;
        }

        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) {
            console.log("❌ Password mismatch");
            return;
        }
        console.log("✅ Password matches");

        try {
            const token = signToken({ id: user.id });
            console.log("✅ Token generated successfully");
        } catch (e) {
            console.error("❌ Token generation failed:", e);
        }

    } catch (e) {
        console.error("❌ Exception during login flow:", e);
    }
}

async function main() {
    await testLogin("amulak", "123456");
}

main().catch(console.error);
