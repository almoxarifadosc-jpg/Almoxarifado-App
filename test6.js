const fs = require("fs");
const path = require("path");

function search(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      if (f === "package.json") {
        console.log("Found package.json at:", full);
      }
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory() && !["proc", "sys", "dev", "lib", "lib64", "lib32", "usr", "var", "etc", "bin", "sbin", "boot", "run", "tmp", "opt", "media", "mnt", "node_modules", ".next", ".git"].includes(f)) {
          search(full);
        }
      } catch (e) {}
    }
  } catch (e) {}
}

console.log("Searching for package.json...");
search("/");
console.log("Search finished.");
