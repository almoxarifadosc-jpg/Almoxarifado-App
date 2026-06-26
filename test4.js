const fs = require("fs");
function check(dir) {
  try {
    console.log(`Contents of ${dir}:`, fs.readdirSync(dir));
  } catch (e) {
    console.log(`Error reading ${dir}:`, e.message);
  }
}
check("/app/cloudsql");
check("/app/cloud_sql_proxy");
check("/app/control-plane-api");
