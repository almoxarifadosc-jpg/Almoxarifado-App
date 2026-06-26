const fs = require("fs");
const path = require("path");

const files = [];
function scan(dir) {
  try {
    const list = fs.readdirSync(dir);
    for (const f of list) {
      const full = path.join(dir, f);
      if (["proc", "sys", "dev", "usr", "lib", "lib64", "lib32", "var", "etc", "bin", "sbin", "boot", "run", "tmp", "opt", "media", "mnt", "node_modules", ".next", ".git"].includes(f)) {
        continue;
      }
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          scan(full);
        } else {
          // Check if modified in last 24 hours
          if (Date.now() - stat.mtimeMs < 24 * 60 * 60 * 1000) {
            files.push({ path: full, mtime: stat.mtime });
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
}

scan("/");
console.log("=== Modified Files ===");
console.log(files);
