#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cliRoot = path.resolve(__dirname, "..");
const entrypoint = path.join(cliRoot, "src", "index.ts");

const child = spawn("bun", [entrypoint, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env },
});

child.on("error", (err) => {
  if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
    // eslint-disable-next-line no-console
    console.error("rawr: bun is required but was not found in PATH");
    process.exitCode = 127;
    return;
  }

  // eslint-disable-next-line no-console
  console.error("rawr: failed to launch bun:", err);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (typeof code === "number") process.exitCode = code;
  else if (signal) process.exitCode = 1;
});

