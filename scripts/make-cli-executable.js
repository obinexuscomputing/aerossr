// Import necessary modules
import { chmodSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

// Resolve __filename and __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define the path to the CLI executable
const cliPath = join(__dirname, '../dist/cli/bin/index.js');

try {
  // Ensure the file exists and make it executable
  chmodSync(cliPath, 0o755);
  console.log(`Made ${cliPath} executable`);
} catch (err) {
  console.error(`Error making ${cliPath} executable:`, err.message);
  process.exit(1);
}
