const fs = require('fs');
const path = require('path');

const cliPath = path.join(__dirname, '../dist/cli/index.js');
fs.chmodSync(cliPath, 0o755);