const fs = require('fs');
try {
  console.log('--- Reading package-lock.json ---');
  if (fs.existsSync('package-lock.json')) {
    const content = fs.readFileSync('package-lock.json', 'utf8');
    console.log(content.substring(0, 1000));
  } else {
    console.log('package-lock.json does not exist');
  }
} catch (e) {
  console.error(e);
}
