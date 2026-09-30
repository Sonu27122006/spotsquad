const { execSync } = require('child_process');

console.log('\x1b[33m%s\x1b[0m', '==========================================================');
console.log('\x1b[33m%s\x1b[0m', '  Stopping Smart Parking Management System Services       ');
console.log('\x1b[33m%s\x1b[0m', '==========================================================');

function freePort(port) {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const lines = output.trim().split('\n');
      let killed = false;
      for (const line of lines) {
        if (line.includes('LISTENING') || line.includes('Listen')) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0' && pid !== process.pid.toString()) {
            try {
              execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
              console.log(`\x1b[32m[STOPPED]\x1b[0m Terminated process (PID: ${pid}) on port ${port}`);
              killed = true;
            } catch (e) {}
          }
        }
      }
      if (!killed) {
        console.log(`\x1b[90m[OK]\x1b[0m Port ${port} is already free.`);
      }
    } else {
      execSync(`lsof -ti :${port} | xargs kill -9`, { stdio: 'ignore' });
      console.log(`\x1b[32m[STOPPED]\x1b[0m Freed port ${port}`);
    }
  } catch (err) {
    console.log(`\x1b[90m[OK]\x1b[0m Port ${port} is already free.`);
  }
}

// 1. Stop Backend (Port 5000)
freePort(5000);

// 2. Stop Frontend (Port 5173)
freePort(5173);

console.log('\x1b[32m%s\x1b[0m', '\nAll services stopped successfully. Ports 5000 & 5173 are free.\n');
