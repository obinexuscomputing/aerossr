import { chmodSync, existsSync } from 'fs';
import { join } from 'path';

const cliPath = join(__dirname, 'dist/cli/bin/index.mjs');

if (existsSync(cliPath)) {
  try {
    chmodSync(cliPath, 0o755);
    console.log(`Made ${cliPath} executable`);
  } catch (err) {
    console.error(`Error making ${cliPath} executable:`, err.message);
    process.exit(1);
  }
} else {
  console.error(`File not found: ${cliPath}`);
  process.exit(1);
}
