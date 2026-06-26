const { execSync } = require("child_process");
function run(cmd) {
  try {
    console.log(`=== Running ${cmd} ===`);
    console.log(execSync(cmd, { encoding: "utf8" }));
  } catch (e) {
    console.log(`Error running ${cmd}:`, e.message);
  }
}
run("git status");
run("git log -n 5");
run("git reflog");
run("git branch -a");
