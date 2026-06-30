const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  files.forEach((file) => {
    if (file === '.git') return; // Skip git folder
    const curSource = path.join(source, file);
    const curTarget = path.join(target, file);
    if (fs.lstatSync(curSource).isDirectory()) {
      copyFolderRecursiveSync(curSource, curTarget);
    } else {
      fs.copyFileSync(curSource, curTarget);
    }
  });
}

try {
  console.log('Cloning repository...');
  const tempDir = '/tmp/recovered-repo';
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  execSync(`git clone https://github.com/almoxarifadosc-jpg/Almoxarifado-App.git ${tempDir}`, { stdio: 'inherit' });
  console.log('Repository cloned successfully to', tempDir);

  console.log('Copying files from temp dir to workspace root (/) ...');
  copyFolderRecursiveSync(tempDir, '/');
  console.log('Files copied successfully.');

  // Clean up
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('Cleanup completed.');
} catch (error) {
  console.error('An error occurred:', error.message);
  if (error.stack) console.error(error.stack);
}
