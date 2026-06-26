const fs = require("fs");
const path = require("path");

function walk(dir, results = []) {
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      if (file === "node_modules" || file === ".next" || file === ".git" || file === "proc" || file === "sys" || file === "dev" || file === "usr" || file === "lib" || file === "lib64" || file === "lib32" || file === "libx32" || file === "bin" || file === "sbin" || file === "boot" || file === "run" || file === "tmp" || file === "opt" || file === "media" || file === "mnt" || file === "var" || file === "etc" || file === "home") {
        continue;
      }
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walk(fullPath, results);
        } else {
          if (file.endsWith(".tsx") || file.endsWith(".ts") || file === "package.json") {
            results.push(fullPath);
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  return results;
}

console.log("Searching disk...");
console.log(walk("/"));
