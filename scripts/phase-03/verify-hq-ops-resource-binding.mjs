#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

function toPosix(input) {
  return input.split(path.sep).join("/");
}

async function pathExists(relPath) {
  try {
    await fs.stat(path.join(root, relPath));
    return true;
  } catch {
    return false;
  }
}

async function walk(dirPath, files) {
  let entries = [];
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const nextPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "dist" || entry.name === "node_modules" || entry.name === ".nx") continue;
      await walk(nextPath, files);
      continue;
    }
    if (entry.isFile() && /\.(?:json|[cm]?[jt]sx?|mjs|cjs|md)$/.test(entry.name)) {
      files.push(nextPath);
    }
  }
}

function isActiveScanPath(relPath) {
  if (relPath === "package.json" || relPath === "vitest.config.ts" || relPath === "bun.lock") return true;
  if (relPath.startsWith("apps/")) return true;
  if (relPath.startsWith("services/hq-ops/")) return true;
  if (relPath.startsWith("plugins/cli/plugins/")) return true;
  if (relPath.startsWith("scripts/phase-")) return true;
  return false;
}

function repositoryLooksForwardingOnly(source) {
  const highLevelRuntimeVerbs = [
    "configStore.",
    "repoStateStore.",
    "journalStore.",
    "securityRuntime.",
  ];
  return highLevelRuntimeVerbs.some((needle) => source.includes(needle));
}

const findings = [];
const removedPackageRoot = ["packages", "hq-ops-" + "host"].join("/");
const removedPackageName = ["@rawr", "hq-ops-" + "host"].join("/");
const removedPackageToken = "hq-ops-" + "host";

if (await pathExists(`${removedPackageRoot}/package.json`)) {
  findings.push(`${removedPackageRoot}/package.json must not exist`);
}

const files = [];
for (const relRoot of ["apps", "services/hq-ops", "plugins/cli/plugins", "scripts", "packages"]) {
  await walk(path.join(root, relRoot), files);
}
for (const relPath of ["package.json", "vitest.config.ts", "bun.lock"]) {
  files.push(path.join(root, relPath));
}

for (const absPath of files.sort()) {
  const relPath = toPosix(path.relative(root, absPath));
  if (relPath === "scripts/phase-03/verify-hq-ops-resource-binding.mjs") continue;
  if (!isActiveScanPath(relPath)) continue;
  const source = await fs.readFile(absPath, "utf8");

  if (source.includes(removedPackageName) || source.includes(removedPackageRoot) || source.includes(removedPackageToken)) {
    findings.push(`${relPath} still references the removed HQ Ops host package`);
  }

  if (
    relPath.startsWith("services/hq-ops/src/service/modules/") &&
    relPath.endsWith("/repository.ts") &&
    repositoryLooksForwardingOnly(source)
  ) {
    findings.push(`${relPath} still forwards to high-level host runtime/store verbs`);
  }
}

if (findings.length > 0) {
  console.error("verify-hq-ops-resource-binding failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("verify-hq-ops-resource-binding: OK");
