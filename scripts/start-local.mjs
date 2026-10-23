import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import "./sites-env.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const cli = fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url));
const child = spawn(process.execPath, [cli, "dev",
  "--config", path.join(root, "dist/server/wrangler.json"),
  "--local", "--persist-to", path.join(root, ".wrangler/state"),
  "--ip", "127.0.0.1", "--inspector-port", "0",
  "--env-file", path.join(root, ".dev.vars"), ...process.argv.slice(2)],
  {cwd:root,stdio:"inherit"});
child.on("error", () => { console.error("Unable to start the local server. Run npm ci and npm run build first."); process.exitCode=1; });
child.on("exit", code => { process.exitCode=code ?? 1; });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
