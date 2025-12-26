
const fetch = require('node-fetch') || global.fetch;

async function run() {
    try {
        const res = await fetch("https://playmaster-backend-production.up.railway.app/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emailOrUsername: "debug_user", password: "debug_password" })
        });
        const data = await res.json();
        console.log("STATUS:", res.status);
        if (data.details) {
            console.log("ERROR_DETAILS:", data.details);
        } else {
            console.log("FULL_BODY:", JSON.stringify(data));
        }
    } catch (e) {
        console.log("FETCH_FAILED:", e.message);
    }
}
run();
