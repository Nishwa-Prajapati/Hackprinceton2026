const { spawn } = require("child_process");

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const children = [];

function startWorkspace(name, color) {
  const child = spawn(
    npmCommand,
    ["run", "dev", "--workspace", name],
    {
      cwd: process.cwd(),
      stdio: ["inherit", "pipe", "pipe"]
    }
  );

  const prefix = `\u001b[${color}m[${name}]\u001b[0m`;

  child.stdout.on("data", (data) => {
    process.stdout.write(`${prefix} ${data}`);
  });

  child.stderr.on("data", (data) => {
    process.stderr.write(`${prefix} ${data}`);
  });

  child.on("exit", (code) => {
    if (code !== 0) {
      process.exitCode = code ?? 1;
      shutdown();
    }
  });

  children.push(child);
}

function shutdown() {
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGINT");
    }
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startWorkspace("server", "36");
startWorkspace("client", "35");
