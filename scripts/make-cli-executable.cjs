
const fs = require('fs');
const path = require('path');

// Resolve the target path
const target = path.resolve(__dirname, '../dist/cli/bin/index.js');

try {
  fs.chmodSync(target, '755'); // Set the file as executable
  console.log(`Made ${target} executable`);
} catch (err) {
  console.error(`Error making ${target} executable:`, err.message);
  process.exit(1);
}
