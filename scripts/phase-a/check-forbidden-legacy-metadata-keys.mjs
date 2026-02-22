#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const FORBIDDEN_KEYS = ["templateRole", "channel", "publishTier", "published"];

function usage() {
  console.error(
    [
      "Usage:",
      "  bun scripts/phase-a/check-forbidden-legacy-metadata-keys.mjs [--allow-findings] <path> [<path> ...]",
      "",
      "Examples:",
      "  bun scripts/phase-a/check-forbidden-legacy-metadata-keys.mjs packages/hq/src/workspace/plugins.ts plugins/*/*/package.json",
      "  bun scripts/phase-a/check-forbidden-legacy-metadata-keys.mjs --allow-findings plugins/*/*/package.json",
    ].join("\n"),
  );
}

function toPosix(input) {
  return input.split(path.sep).join("/");
}

function keyRegex(key) {
  return new RegExp(`\\b${key}\\b`, "g");
}

function findLineCol(text, index) {
  const before = text.slice(0, index);
  const lines = before.split("\n");
  const line = lines.length;
  const column = lines.at(-1)?.length ?? 0;
  return { line, column: column + 1 };
}

async function expandInput(rawInput) {
  const value = rawInput.trim();
  if (!value.includes("*")) return [value];

  const glob = new Bun.Glob(toPosix(value));
  const matches = [];
  for await (const m of glob.scan({ cwd: process.cwd(), absolute: true })) {
    matches.push(path.resolve(m));
  }
  if (matches.length === 0) return [value];
  matches.sort();
  return matches;
}

async function collectTargets(inputs) {
  const expanded = await Promise.all(inputs.map(expandInput));
  const flat = expanded.flat().map((item) => path.resolve(item));
  return [...new Set(flat)].sort();
}

async function scanFile(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  const findings = [];

  for (const key of FORBIDDEN_KEYS) {
    const re = keyRegex(key);
    let match;
    while ((match = re.exec(text)) !== null) {
      const pos = findLineCol(text, match.index);
      findings.push({ file: filePath, key, line: pos.line, column: pos.column });
    }
  }

  return findings;
}

const args = process.argv.slice(2);
const allowFindings = args.includes("--allow-findings") || args.includes("--report-only");
const targetsInput = args.filter((arg) => arg !== "--allow-findings" && arg !== "--report-only");

if (targetsInput.length === 0) {
  usage();
  process.exit(2);
}

const targets = await collectTargets(targetsInput);
if (targets.length === 0) {
  console.error("No scan targets resolved.");
  process.exit(2);
}

const missing = [];
const allFindings = [];

for (const filePath of targets) {
  try {
    const st = await fs.stat(filePath);
    if (!st.isFile()) {
      missing.push(filePath);
      continue;
    }
    const findings = await scanFile(filePath);
    allFindings.push(...findings);
  } catch {
    missing.push(filePath);
  }
}

allFindings.sort((a, b) => {
  if (a.file !== b.file) return a.file.localeCompare(b.file);
  if (a.line !== b.line) return a.line - b.line;
  if (a.column !== b.column) return a.column - b.column;
  return a.key.localeCompare(b.key);
});

if (missing.length > 0) {
  console.error("Missing scan targets:");
  for (const item of missing.sort()) {
    console.error(`  - ${item}`);
  }
}

if (allFindings.length === 0) {
  console.log(`No forbidden legacy metadata key references found across ${targets.length} files.`);
  process.exit(missing.length > 0 ? 2 : 0);
}

console.log(`Found ${allFindings.length} forbidden legacy metadata key reference(s):`);
for (const finding of allFindings) {
  const rel = path.relative(process.cwd(), finding.file) || finding.file;
  console.log(`  - ${toPosix(rel)}:${finding.line}:${finding.column} uses \"${finding.key}\"`);
}

if (allowFindings) {
  console.log("Legacy metadata findings allowed for scaffold mode (--allow-findings)." );
  process.exit(missing.length > 0 ? 2 : 0);
}

process.exit(1);
