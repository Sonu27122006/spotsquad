const { spawn, execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\x1b[36m%s\x1b[0m', '==========================================================');
console.log('\x1b[36m%s\x1b[0m', '  ParkingSpot – Smart Parking Reservation Platform        ');
console.log('\x1b[36m%s\x1b[0m', '==========================================================');

const backendDir = path.join(__dirname, 'backend');
const frontendDir = path.join(__dirname, 'frontend');

// Helper function to free up port if already in use
function freePort(port) {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const lines = output.trim().split('\n');
      for (const line of lines) {
        if (line.includes('LISTENING') || line.includes('Listen')) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0' && pid !== process.pid.toString()) {
            try {
              execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
            } catch (e) {}
          }
        }
      }
    }
  } catch (err) {}
}

// 0. Auto Free Port 5000 (Backend) and Port 5173 (Frontend)
freePort(5000);
freePort(5173);

// 1. Start Node.js Express + MongoDB Backend Process
console.log('\x1b[34m%s\x1b[0m', '[1/2] Starting Node.js Express REST API on http://localhost:5000 ...');
const backendProc = spawn('node', ['server.js'], {
  cwd: backendDir,
  shell: true,
  stdio: 'pipe',
});

backendProc.stdout.on('data', (data) => {
  process.stdout.write(`\x1b[34m[BACKEND]\x1b[0m ${data}`);
});

backendProc.stderr.on('data', (data) => {
  process.stderr.write(`\x1b[31m[BACKEND ERROR]\x1b[0m ${data}`);
});

// 2. Start Frontend Vite Process
console.log('\x1b[32m%s\x1b[0m', '[2/2] Starting React Vite Frontend on http://localhost:5173 ...');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const frontendProc = spawn(npmCmd, ['run', 'dev'], {
  cwd: frontendDir,
  shell: true,
  stdio: 'pipe',
});

let browserOpened = false;

frontendProc.stdout.on('data', (data) => {
  process.stdout.write(`\x1b[32m[FRONTEND]\x1b[0m ${data}`);
  const str = data.toString();
  if ((str.includes('ready in') || str.includes('Local:')) && !browserOpened) {
    browserOpened = true;
    setTimeout(() => {
      console.log('\x1b[35m%s\x1b[0m', '[BROWSER] Opening ParkingSpot on http://localhost:5173 ...');
      if (process.platform === 'win32') {
        exec('start http://localhost:5173');
      } else if (process.platform === 'darwin') {
        exec('open http://localhost:5173');
      } else {
        exec('xdg-open http://localhost:5173');
      }
    }, 500);
  }
});

frontendProc.stderr.on('data', (data) => {
  process.stderr.write(`\x1b[33m[FRONTEND]\x1b[0m ${data}`);
});

// Handle Exit
function cleanup() {
  console.log('\n\x1b[33m%s\x1b[0m', 'Shutting down services...');
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${backendProc.pid} /T /F`, { stdio: 'ignore' });
      execSync(`taskkill /pid ${frontendProc.pid} /T /F`, { stdio: 'ignore' });
    } else {
      backendProc.kill();
      frontendProc.kill();
    }
  } catch (e) {}
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
