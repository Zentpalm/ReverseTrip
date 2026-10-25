// Runs only when the owner explicitly invokes npm run test:e2e.
// A fresh temporary database avoids touching any developer or production data.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const dir = mkdtempSync(join(tmpdir(), 'reversetrip-e2e-'));
const env = {
  ...process.env,
  APP_MODE: 'demo',
  SQLITE_PATH: join(dir, 'e2e.sqlite'),
  // Explicit empty values prevent Next from reloading live settings from .env.local.
  DATABASE_URL: '',
  APP_ORIGIN: '',
  SESSION_SECURE: 'false',
  NEXT_TELEMETRY_DISABLED: '1',
};
const child = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3100'],
  { stdio: 'inherit', env },
);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', (code) => {
  rmSync(dir, { recursive: true, force: true });
  process.exit(code || 0);
});
