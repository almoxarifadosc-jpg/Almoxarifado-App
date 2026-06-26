const fs = require("fs");
const path = require("path");

function findProjectFiles(dir, maxDepth = 5, currentDepth = 0) {
  if (currentDepth > maxDepth) return [];
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      if (file === "node_modules" || file === ".next" || file === ".git" || file === "proc" || file === "sys" || file === "dev" || file === "usr" || file === "var" || file === "etc" || file === "lib" || file === "lib64" || file === "lib32" || file === "libx32" || file === "bin" || file === "sbin" || file === "boot" || file === "run" || file === "tmp" || file === "opt" || file === "media" || file === "mnt") {
        continue;
      }
      try {
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results = results.concat(findProjectFiles(fullPath, maxDepth, currentDepth + 1));
        } else {
          if (file === "package.json" || file.endsWith(".tsx") || file.endsWith(".ts")) {
            results.push(fullPath);
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  return results;
}

console.log("Searching for project files from root /...");
console.log(findProjectFiles("/", 6));
