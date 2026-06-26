const fs = require("fs");
function check(dir) {
  try {
    console.log(`Contents of ${dir}:`, fs.readdirSync(dir));
  } catch (e) {
    console.log(`Error reading ${dir}:`, e.message);
  }
}
check("/root");
check("/home/node");
check("/opt");
check("/var");
check("/tmp");
