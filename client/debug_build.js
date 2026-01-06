
import { exec } from 'child_process';
import fs from 'fs';

exec('npx tsc -b', { encoding: 'utf8' }, (error, stdout, stderr) => {
    const output = `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}\n\nERROR:\n${error ? error.message : 'None'}`;
    fs.writeFileSync('build_debug_output.txt', output, 'utf8');
    console.log('Done writing debug output');
});
