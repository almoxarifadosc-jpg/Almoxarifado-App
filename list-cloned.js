const { execSync } = require('child_process');
try {
  console.log('Running git clone again but listing files:');
  const tempDir = '/tmp/recovered-repo-2';
  execSync(`git clone https://github.com/almoxarifadosc-jpg/Almoxarifado-App.git ${tempDir}`, { stdio: 'inherit' });
  console.log('Files in recovered-repo-2:');
  const files = execSync(`find ${tempDir} -maxdepth 3`, { encoding: 'utf-8' });
  console.log(files);
} catch (e) {
  console.error(e);
}
