#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

function run(command, { capture = false } = {}) {
  const result = Bun.spawnSync({
    cmd: ["/bin/sh", "-lc", command],
    cwd: root,
    env: process.env,
    stdout: capture ? "pipe" : "inherit",
    stderr: capture ? "pipe" : "inherit",
  });

  if (result.exitCode !== 0) {
    if (capture) {
      const stdout = Buffer.from(result.stdout).toString("utf8");
      const stderr = Buffer.from(result.stderr).toString("utf8");
      if (stdout.trim()) process.stdout.write(stdout);
      if (stderr.trim()) process.stderr.write(stderr);
    }
    process.exit(result.exitCode ?? 1);
  }

  return capture ? Buffer.from(result.stdout).toString("utf8") : "";
}

run("bunx nx report");

const projectsJson = run("bunx nx show projects --json", { capture: true });
const projects = JSON.parse(projectsJson);
console.log(`nx:doctor resolved ${projects.length} project(s).`);

const disabledMarker = path.join(root, ".nx", "workspace-data", "d", "disabled");
try {
  await fs.access(disabledMarker);
  console.warn("nx:doctor warning: Nx daemon is currently disabled; graph/caching may still be correct, but warm-run latency will be worse.");
} catch {
  console.log("nx:doctor: Nx daemon marker not present.");
}
