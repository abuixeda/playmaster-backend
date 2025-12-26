
const fetch = require('node-fetch') || global.fetch;

async function run() {
    try {
        console.log("Probing remote server...");
        const res = await fetch("https://playmaster-backend-production.up.railway.app/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emailOrUsername: "debug_Check", password: "pwd" })
        });

        console.log(`HTTP Status: ${res.status}`);
        const data = await res.json();

        if (data.details) {
            console.log("\n--- ERROR DETAILS FROM SERVER ---");
            console.log(data.details);
            console.log("---------------------------------\n");

            // Check for specific error patterns
            if (data.details.includes("us-east-1")) {
                console.log("DIAGNOSIS: Server is still trying to connect to the OLD (US) database.");
            } else if (data.details.includes("sa-east-1")) {
                console.log("DIAGNOSIS: Server is connecting to the NEW (SA) database.");
            }

            if (data.details.includes("Can't reach database server")) {
                console.log("DIAGNOSIS: Connection timeout or unreachable host.");
            }
        } else {
            console.log("Response:", JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("Script Error:", e.message);
    }
}
run();
