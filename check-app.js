const fs = require('fs');
const path = require('path');

function walkDir(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
          results.push(filePath + '/');
          results = results.concat(walkDir(filePath));
        } else {
          results.push(filePath);
        }
      } catch (err) {
        results.push(filePath + ' (error)');
      }
    });
  } catch (err) {
    results.push(dir + ' (error readdir)');
  }
  return results;
}

console.log('--- Walking /app recursively ---');
const allFiles = walkDir('/app');
console.log(allFiles.join('\n'));
