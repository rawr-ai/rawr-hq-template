#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const REQUIRED_SUITES = [
  "suite:web:first-party-rpc",
  "suite:web:published-openapi",
  "suite:cli:in-process",
  "suite:api:boundary",
  "suite:workflow:trigger-status",
  "suite:runtime:ingress",
  "suite:cross-surface:metadata-import-boundary",
];

const modeArg = process.argv.find((arg) => arg.startsWith("--mode="));
const mode = (modeArg?.split("=", 2)[1] ?? "baseline").trim();
const strict = mode === "strict" || process.argv.includes("--strict");

const searchRoots = [
  path.join(process.cwd(), "apps", "server", "test"),
  path.join(process.cwd(), "packages", "hq", "test"),
  path.join(process.cwd(), "plugins", "cli", "plugins", "test"),
];

async function listTestFiles(dir) {
  const out = [];
  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await listTestFiles(abs)));
      continue;
    }
    if (entry.isFile() && /\.(test|spec)\.tsx?$/.test(entry.name)) {
      out.push(abs);
    }
  }
  return out;
}

const files = (await Promise.all(searchRoots.map(listTestFiles))).flat().sort();
const corpus = (await Promise.all(files.map((file) => fs.readFile(file, "utf8").catch(() => "")))).join("\n");

const missing = REQUIRED_SUITES.filter((suiteId) => !corpus.includes(suiteId));
if (missing.length === 0) {
  console.log("harness-matrix passed: all required suite IDs are present.");
  process.exit(0);
}

if (!strict) {
  console.log("harness-matrix (baseline) pending required suite IDs:");
  for (const suiteId of missing) {
    console.log(`  - ${suiteId}`);
  }
  console.log("Baseline mode does not fail on missing suite IDs.");
  process.exit(0);
}

console.error("harness-matrix (strict) failed; missing suite IDs:");
for (const suiteId of missing) {
  console.error(`  - ${suiteId}`);
}
process.exit(1);
