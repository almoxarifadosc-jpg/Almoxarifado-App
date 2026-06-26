const fs = require("fs");
console.log("/lib/fcm.ts exists:", fs.existsSync("/lib/fcm.ts"));
console.log("/app/page.tsx exists:", fs.existsSync("/app/page.tsx"));
console.log("/public/firebase-messaging-sw.js exists:", fs.existsSync("/public/firebase-messaging-sw.js"));
console.log("/package.json exists:", fs.existsSync("/package.json"));
console.log("=== Listing / ===");
console.log(fs.readdirSync("/"));
