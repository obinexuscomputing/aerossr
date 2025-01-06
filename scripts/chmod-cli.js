const fs = require('fs');
const path = require('path');

function makeExecutable(filePath) {
  if (process.platform === 'win32') return;

  try {
    const fullPath = path.resolve(__dirname, '..', filePath);
    const stats = fs.statSync(fullPath);
    
    if (!(stats.mode & fs.constants.S_IXUSR)) {
      fs.chmodSync(fullPath, stats.mode | fs.constants.S_IXUSR);
      console.log(`Made ${fullPath} executable`);
    }
  } catch (err) {
    console.error(`Error with ${filePath}:`, err.message);
  }
}

['dist/cli/bin/index.cjs', 'dist/cli/bin/index.mjs'].forEach(makeExecutable);