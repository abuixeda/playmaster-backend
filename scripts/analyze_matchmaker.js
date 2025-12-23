
const fs = require('fs');

const LOG_FILE = 'matchmaker_debug.log';

function analyze() {
    if (!fs.existsSync(LOG_FILE)) {
        console.log("No log file found.");
        return;
    }

    const lines = fs.readFileSync(LOG_FILE, 'utf8').split('\n');
    console.log(`Analyzing ${lines.length} log lines...`);

    const queue = new Map(); // userId -> { type, bet, elo, time }

    lines.forEach(line => {
        if (!line.trim()) return;

        // Parse timestamp [HH:MM:SS]
        const timeMatch = line.match(/^\[(.*?)\]/);
        const time = timeMatch ? timeMatch[1] : '?';

        if (line.includes("added")) {
            // Player ... added. Type: ..., Bet: ..., Elo: ...
            const userMatch = line.match(/Player (.*?) added/);
            const typeMatch = line.match(/Type: (.*?),/);
            const betMatch = line.match(/Bet: (.*?),/);

            if (userMatch && typeMatch && betMatch) {
                const uid = userMatch[1];
                queue.set(uid, {
                    type: typeMatch[1],
                    bet: betMatch[1],
                    lastAction: 'ADDED',
                    time
                });
            }
        } else if (line.includes("removed")) {
            const userMatch = line.match(/Player (.*?) removed/);
            if (userMatch) {
                queue.delete(userMatch[1]);
            }
        } else if (line.includes("MATCH FOUND")) {
            // Clear participants involved?
            // Usually removed logs follow, but let's note it.
        }
    });

    console.log("\n=== ESTADO ACTUAL ESTIMADO DE LA COLA ===");
    if (queue.size === 0) {
        console.log("(Cola Vacía)");
    } else {
        queue.forEach((val, key) => {
            console.log(`User: [${key}] | Juego: ${val.type} | Apuesta: ${val.bet} | Hora: ${val.time} aprox`);
        });
    }

    console.log("\n=== ÚLTIMOS 10 EVENTOS CRUDOS ===");
    lines.slice(-10).forEach(l => console.log(l));
}

analyze();
