
import fs from 'fs';
import { exec } from 'child_process';

const logFile = 'betting_verification.log';

// Run verification and pipe to file
exec('npx tsx scripts/verify_betting.ts', (err, stdout, stderr) => {
    console.log("--- STDOUT ---");
    console.log(stdout);
    console.log("--- STDERR ---");
    console.log(stderr);
});
