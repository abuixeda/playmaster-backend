import { start } from "./server";

console.log("[BOOT] Bootstrapping server...");
start().then(() => {
    console.log("[BOOT] Server started successfully");
}).catch(err => {
    console.error("[BOOT] Failed to start server:", err);
    if (err.stack) console.error(err.stack);
    process.exit(1);
});
