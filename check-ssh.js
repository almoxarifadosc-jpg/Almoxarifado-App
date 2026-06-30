const fs = require('fs');
const { execSync } = require('child_process');

console.log('--- Checking /root/.ssh ---');
if (fs.existsSync('/root/.ssh')) {
  try {
    console.log(fs.readdirSync('/root/.ssh'));
  } catch (e) {
    console.error(e);
  }
} else {
  console.log('/root/.ssh does not exist');
}

console.log('--- Checking git credential helper ---');
try {
  console.log(execSync('git config --get credential.helper || true', { encoding: 'utf-8' }));
} catch (e) {
  console.error(e);
}

console.log('--- Checking git ssh command ---');
try {
  console.log(execSync('git config --get core.sshCommand || true', { encoding: 'utf-8' }));
} catch (e) {
  console.error(e);
}
