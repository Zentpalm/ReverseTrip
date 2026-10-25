import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
// Match Next's normal local development configuration for CLI commands.
const path = resolve('.env.local');
if (existsSync(path)) process.loadEnvFile(path);
