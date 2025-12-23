
const fs = require('fs');
const LOG_FILE = 'matchmaker_debug.log';

try {
    const lines = fs.readFileSync(LOG_FILE, 'utf8').split('\n');
    const recent = lines.slice(-200); // Last 200 lines

    // Find "Attempting match for X"
    const attempts = recent.filter(l => l.includes("Attempting match for"));

    const users = new Set();
    attempts.forEach(l => {
        const match = l.match(/for (.*?) \(/);
        if (match) users.add(match[1]);
    });

    console.log(`Unique Users attempting match in last logs: ${users.size}`);
    users.forEach(u => console.log(` - ${u}`));

} catch (e) { console.log(e); }
