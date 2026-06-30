const fs = require("fs");
try {
  console.log("workspace exists:", fs.existsSync("/workspace"));
  if (fs.existsSync("/workspace")) {
    console.log("workspace content:", fs.readdirSync("/workspace"));
  }
} catch (e) {
  console.log("Error reading /workspace:", e.message);
}
try {
  console.log("root content:", fs.readdirSync("/"));
} catch (e) {
  console.log("Error reading root:", e.message);
}
