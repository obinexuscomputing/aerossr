#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLI_FILES = [
  '../dist/cli/bin/index.cjs',
  '../dist/cli/bin/index.mjs'
];

async function makeExecutable() {
  if (process.platform === 'win32') {
    console.log('Skipping chmod on Windows');
    return;
  }

  for (const filePath of CLI_FILES) {
    try {
      const resolvedPath = path.resolve(__dirname, filePath);
      const stats = await fs.promises.stat(resolvedPath);
      
      if (!(stats.mode & fs.constants.S_IXUSR)) {
        await fs.promises.chmod(resolvedPath, stats.mode | fs.constants.S_IXUSR);
        console.log(`Made ${resolvedPath} executable`);
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.error(`File not found: ${filePath}`);
      } else {
        console.error(`Error processing ${filePath}:`, err.message);
      }
      process.exit(1);
    }
  }
}

makeExecutable().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});