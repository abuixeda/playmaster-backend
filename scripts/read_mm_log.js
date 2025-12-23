
const fs = require('fs');
try {
    const logs = fs.readFileSync('matchmaker_debug.log', 'utf8').split('\n');
    console.log("--- LAST 10 LOGS ---");
    logs.slice(-10).forEach(l => console.log(l));

    console.log("\n--- ANALYSIS ---");
    // Extract Player Added lines
    const adds = logs.filter(l => l.includes("Player") && l.includes("added"));
    adds.slice(-5).forEach(a => console.log(a));
} catch (e) { console.log("No log file found"); }
