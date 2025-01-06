#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function makeExecutable(filePath) {
  if (process.platform === 'win32') {
    return; // Skip chmod on Windows
  }

  try {
    const resolvedPath = path.resolve(__dirname, filePath);
    const stats = fs.statSync(resolvedPath);
    
    // Add executable permission if not present
    if (!(stats.mode & fs.constants.S_IXUSR)) {
      fs.chmodSync(resolvedPath, stats.mode | fs.constants.S_IXUSR);
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

// Handle both CJS and MJS CLI files
const targets = [
  '../dist/cli/bin/index.cjs',
  '../dist/cli/bin/index.mjs'
];

targets.forEach(makeExecutable);