const fs = require("fs");
try {
  console.log("=== /proc/mounts ===");
  console.log(fs.readFileSync("/proc/mounts", "utf8"));
} catch (e) {
  console.log("Error reading /proc/mounts:", e.message);
}
