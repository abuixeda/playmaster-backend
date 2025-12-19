
import { Matchmaker } from "../src/services/Matchmaker";

async function testMatchmaking() {
    console.log("=== Testing Matchmaking Simulation ===");

    // Mock callback
    Matchmaker.onMatchFound = (p1, p2, gid) => {
        console.log(`\n✅ MATCH FOUND! ${p1.userId} vs ${p2.userId} (Game: ${gid})`);
    };

    // Simulate P1
    console.log("Adding P1...");
    const res1 = Matchmaker.addToQueue("user1", "socket1", "TRUCO", 100, 1200);
    console.log("P1 Result:", res1);

    // Simulate P2 (Same params)
    console.log("Adding P2...");
    const res2 = Matchmaker.addToQueue("user2", "socket2", "TRUCO", 100, 1200);
    console.log("P2 Result:", res2);

    // If P1 and P2 have same Elo, they should match IMMEDIATELY in 'tryMatch' inside 'addToQueue'.
    // If not, we wait for interval.
}

testMatchmaking();
