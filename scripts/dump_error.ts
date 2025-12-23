
import fs from 'fs';
import path from 'path';

const logPath = path.join(process.cwd(), 'server_log_4005.txt');

try {
    const content = fs.readFileSync(logPath, 'utf16le');
    const lines = content.split('\n');
    let output = "";
    for (let i = 60; i < 180; i++) {
        if (lines[i]) output += i + ": " + lines[i].trim() + "\n";
    }
    fs.writeFileSync(path.join(process.cwd(), 'debug_error.txt'), output, 'utf8');
} catch (e) {
    console.error("Failed to dump log:", e);
}
