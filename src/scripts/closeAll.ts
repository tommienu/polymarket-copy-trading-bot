#!/usr/bin/env ts-node

/**
 * Run both close-stale and close-resolved scripts in sequence.
 */

import { execSync } from 'child_process';

const run = (cmd: string) => {
    execSync(cmd, { stdio: 'inherit' });
};

try {
    run('npm run close-stale');
    run('npm run close-resolved');
    run('npm run redeem-resolved');
} catch (error) {
    process.exit(1);
}
