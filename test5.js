const { execSync } = require("child_process");
try {
  console.log("=== Running Processes ===");
  console.log(execSync("ps aux", { encoding: "utf8" }));
} catch (e) {
  console.log("Error running ps:", e.message);
}
try {
  console.log("=== Network Connections ===");
  console.log(execSync("netstat -tuln || ss -tuln", { encoding: "utf8" }));
} catch (e) {
  console.log("Error running netstat/ss:", e.message);
}
