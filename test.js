const fs = require("fs");
console.log("=== Checking /app/applet content ===");
const list = fs.readdirSync("/app/applet");
console.log(list);
for (const item of list) {
  try {
    const stat = fs.statSync("/app/applet/" + item);
    if (stat.isDirectory()) {
      console.log(`- ${item}/ has contents:`, fs.readdirSync("/app/applet/" + item));
    }
  } catch (e) {
    console.log(`- Error reading ${item}:`, e.message);
  }
}
