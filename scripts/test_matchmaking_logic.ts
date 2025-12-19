
import { Matchmaker } from "../src/services/Matchmaker";

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testMatchmaking() {
    console.log("🧪 Testing Matchmaking Logic...");

    // Clear queue (private but static, maybe we assume empty or restart)
    // Actually we can just remove dummy users if any

    // Test 1: Immediate Match (Similiar Elo)
    console.log("\n--- Test 1: Immediate Match ---");
    const p1 = Matchmaker.addToQueue("user1", "s1", "TRUCO", 100, 1200);
    const p2 = Matchmaker.addToQueue("user2", "s2", "TRUCO", 100, 1250); // Diff 50 (within 100)

    if (p2.matchFound) console.log("✅ Immediate match successful");
    else console.error("❌ Immediate match failed (should have matched)");

    // Test 2: Elo Mismatch -> Wait -> Match
    console.log("\n--- Test 2: Elo Mismatch (Wait for Expansion) ---");
    // User 3 (1000) vs User 4 (1500). Diff 500. Initial range 100.
    // Needs expansion. Rate 50 per 3s check?
    // Max steps needed: (500 - 100) / 50 = 8 steps. 8 * 3s = 24s.
    // Let's reduce intervals for testing manually if needed, or mock Math/Date?
    // We can't mock Date easily in this script without library.
    // We'll trust logic but maybe simulate a smaller gap or shorter interval if we could config it.
    // Since interval is private static 3000ms... we have to wait.
    // Let's try a smaller gap: 1200 vs 1350. Diff 150.
    // Initial 100. Need +50. 1 step (3s).

    Matchmaker.addToQueue("user3", "s3", "TRUCO", 50, 1200);
    const p4 = Matchmaker.addToQueue("user4", "s4", "TRUCO", 50, 1350);

    if (p4.matchFound) {
        console.error("❌ Should NOT match immediately (Diff 150 > 100)");
    } else {
        console.log("✅ Correctly queued (Diff > Range)");
    }

    // Capture background match
    let matchDetected = false;
    Matchmaker.onMatchFound = (pi, pj, gid) => {
        console.log(`✅ Async Match Found: ${pi.userId} vs ${pj.userId}`);
        matchDetected = true;
    };

    console.log("Waiting for expansion (approx 4s)...");
    await sleep(4000); // 4s > 3s interval

    if (matchDetected) console.log("✅ Expansion match confirmed");
    else console.error("❌ Async match not triggered in time");

    // Cleanup interval
    process.exit(0);
}

testMatchmaking();
