#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const packagePath = path.join(root, "packages", "core", "package.json");
const indexPath = path.join(root, "packages", "core", "src", "index.ts");
const telemetryPath = path.join(root, "packages", "core", "src", "telemetry.ts");

const [pkgRaw, indexSource, telemetrySource] = await Promise.all([
  fs.readFile(packagePath, "utf8"),
  fs.readFile(indexPath, "utf8"),
  fs.readFile(telemetryPath, "utf8"),
]);

const pkg = JSON.parse(pkgRaw);
if (!(pkg.nx?.tags ?? []).includes("migration-slice:structural-tranche")) {
  console.error("core structural failed: missing tranche tag.");
  process.exit(1);
}

for (const scriptName of ["sync", "structural"]) {
  if (!(scriptName in (pkg.scripts ?? {}))) {
    console.error(`core structural failed: missing ${scriptName} script.`);
    process.exit(1);
  }
}

if ("./orpc" in (pkg.exports ?? {})) {
  console.error("core structural failed: legacy ./orpc export must be removed.");
  process.exit(1);
}

if (!("./telemetry" in (pkg.exports ?? {}))) {
  console.error("core structural failed: telemetry support seam export missing.");
  process.exit(1);
}

for (const dependency of ["@rawr/coordination", "@rawr/coordination-inngest", "@rawr/runtime-context", "@rawr/state", "inngest"]) {
  if (dependency in (pkg.dependencies ?? {})) {
    console.error(`core structural failed: unexpected live dependency ${dependency}.`);
    process.exit(1);
  }
}

for (const stalePath of ["packages/core/src/orpc/hq-router.ts", "packages/core/src/orpc/runtime-router.ts", "packages/core/src/orpc/index.ts"]) {
  try {
    await fs.access(path.join(root, stalePath));
    console.error(`core structural failed: stale file still exists at ${stalePath}.`);
    process.exit(1);
  } catch {
    // expected
  }
}

if (!indexSource.includes('./cli/rawr-command') && !indexSource.includes("./cli/rawr-command")) {
  console.error("core structural failed: RawrCommand residue missing.");
  process.exit(1);
}

if (!telemetrySource.includes("installRawrOrpcTelemetry")) {
  console.error("core structural failed: telemetry support seam missing.");
  process.exit(1);
}

console.log("core support structural verified");
