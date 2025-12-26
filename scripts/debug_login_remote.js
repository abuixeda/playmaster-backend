
// Script to debug remote login error
async function run() {
    const url = "https://playmaster-backend-production.up.railway.app/api/auth/login";
    console.log("Fetching:", url);
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emailOrUsername: "debug_user", password: "debug_password" })
        });
        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Response Body:", text);
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}
run();
