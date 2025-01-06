#!/usr/bin/env node
import { chmodSync, statSync, constants } from 'fs';
import { fileURLToPath } from 'url';
import { resolve, dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function makeExecutable(filePath) {
  if (process.platform === 'win32') {
    return; // Skip chmod on Windows
  }

  try {
    const resolvedPath = resolve(__dirname, filePath);
    const stats = statSync(resolvedPath);
    
    // Add executable permission if not present
    if (!(stats.mode & constants.S_IXUSR)) {
      chmodSync(resolvedPath, stats.mode | constants.S_IXUSR);
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

// Handle both CLI entry points
const targets = [
  'dist/cli/bin/index.mjs',
  'dist/cli/bin/index.cjs'
];

targets.forEach(makeExecutable);