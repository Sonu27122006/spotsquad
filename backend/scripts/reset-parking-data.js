const { spawnSync, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\x1b[36m%s\x1b[0m', '==========================================================');
console.log('\x1b[36m%s\x1b[0m', '  Resetting Parking Transaction Data                      ');
console.log('\x1b[36m%s\x1b[0m', '==========================================================');

const backendDir = path.join(__dirname, '..');

// 1. Compile backend if bin doesn't exist
try {
  function getJavaFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getJavaFiles(fullPath));
      } else if (file.endsWith('.java')) {
        results.push(`"${fullPath}"`);
      }
    });
    return results;
  }

  const sources = getJavaFiles(path.join(backendDir, 'src', 'main', 'java'));
  const binDir = path.join(backendDir, 'bin');
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  const javacCmd = `javac -encoding UTF-8 -cp "${path.join(backendDir, 'lib', '*')}" -d "${binDir}" ${sources.join(' ')}`;
  execSync(javacCmd, { cwd: backendDir, stdio: 'inherit' });
} catch (e) {
  console.error('\x1b[31m%s\x1b[0m', '[ERROR] Failed compiling Java backend:', e.message);
  process.exit(1);
}

// 2. Run DataResetTool
const cp = process.platform === 'win32' ? 'bin;lib/*' : 'bin:lib/*';
const res = spawnSync('java', ['-cp', cp, 'com.smartparking.database.DataResetTool'], {
  cwd: backendDir,
  stdio: 'inherit',
  shell: true
});

if (res.status === 0) {
  console.log('\x1b[32m%s\x1b[0m', '[SUCCESS] Parking records cleared. Database is 100% fresh!');
} else {
  console.error('\x1b[31m%s\x1b[0m', '[ERROR] Reset failed with status code: ' + res.status);
  process.exit(res.status || 1);
}
