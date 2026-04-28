#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const workbenchRoot = resolve(dirname(scriptPath), "..");

function findRepoRoot(start) {
  let current = resolve(start);
  while (current !== dirname(current)) {
    if (existsSync(join(current, "package.json")) && existsSync(join(current, "docs", "process", "GRAPHITE.md"))) {
      return current;
    }
    current = dirname(current);
  }
  throw new Error(`Unable to find repository root from ${start}`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    env: {
      ...process.env,
      UV_PROJECT_ENVIRONMENT: join(repoRoot, ".semantica", "venv"),
    },
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  process.exitCode = result.status ?? 1;
  if (process.exitCode !== 0) {
    process.exit(process.exitCode);
  }
}

const repoRoot = findRepoRoot(workbenchRoot);
const argv = process.argv.slice(2);
const command = argv.shift() ?? "help";
if (argv[0] === "--") {
  argv.shift();
}

if (command === "setup") {
  run("uv", ["sync", "--project", workbenchRoot, "--python", "3.12"]);
} else {
  run("uv", ["run", "--project", workbenchRoot, "--python", "3.12", "semantica-workbench", command, ...argv]);
}
