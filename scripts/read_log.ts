
import fs from 'fs';
import path from 'path';

const logPath = path.join(process.cwd(), 'server_log_4004.txt');

try {
    const content = fs.readFileSync(logPath, 'utf16le');
    const lines = content.split('\n');

    for (let i = 70; i < 80; i++) {
        if (lines[i]) console.log(i + ": " + lines[i].trim());
    }
} catch (e) {
    console.error("Failed to read log:", e);
}
