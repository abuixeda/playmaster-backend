import { start } from "./server";
import { execSync } from "child_process";

console.log("[BOOT] Bootstrapping server...");

try {
    console.log("[BOOT] Running database migrations...");
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
    console.log("[BOOT] Migrations applied successfully.");
} catch (error) {
    console.error("[BOOT] Error applying migrations:", error);
    // Continue anyway? Or exit? Usually exit if DB is not ready. 
    // But maybe let it try to start.
}

start().then(() => {
    console.log("[BOOT] Server started successfully");
}).catch(err => {
    console.error("[BOOT] Failed to start server:", err);
    if (err.stack) console.error(err.stack);
    process.exit(1);
});
