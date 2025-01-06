#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function makeExecutable(filepath) {
  if (process.platform === 'win32') return;
  
  try {
    const fullPath = path.resolve(__dirname, '..', filepath);
    if (fs.existsSync(fullPath)) {
      fs.chmodSync(fullPath, '755');
      console.log(`Made ${filepath} executable`);
    }
  } catch (err) {
    console.error(`Failed to make ${filepath} executable:`, err.message);
  }
}

['dist/cli/bin/index.cjs', 'dist/cli/bin/index.mjs'].forEach(makeExecutable);