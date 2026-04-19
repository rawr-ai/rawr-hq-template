#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const packagePath = path.join(root, "apps", "hq", "package.json");
const manifestPath = path.join(root, "apps", "hq", "src", "manifest.ts");
const testingPath = path.join(root, "apps", "hq", "src", "testing.ts");

const [pkgRaw, manifestSource, testingSource] = await Promise.all([
  fs.readFile(packagePath, "utf8"),
  fs.readFile(manifestPath, "utf8"),
  fs.readFile(testingPath, "utf8"),
]);

const pkg = JSON.parse(pkgRaw);
const requiredTags = ["type:app", "app:hq", "migration-slice:structural-tranche"];
for (const tag of requiredTags) {
  if (!(pkg.nx?.tags ?? []).includes(tag)) {
    console.error(`hq-app structural failed: missing tag ${tag}`);
    process.exit(1);
  }
}

if (!manifestSource.includes("export function createRawrHqManifest")) {
  console.error("hq-app structural failed: manifest factory export missing.");
  process.exit(1);
}

if (
  !manifestSource.includes("registerCoordinationApiPlugin") ||
  !manifestSource.includes("registerStateApiPlugin") ||
  !manifestSource.includes("registerExampleTodoApiPlugin")
) {
  console.error("hq-app structural failed: manifest must compose plugin-owned ORPC surfaces.");
  process.exit(1);
}

if (manifestSource.includes("createHqRuntimeRouter") || manifestSource.includes("@rawr/core/orpc")) {
  console.error("hq-app structural failed: app authority must not own or import a special HQ router seam.");
  process.exit(1);
}

if (manifestSource.includes("apps/server/src/logging") || manifestSource.includes('from "pino"') || manifestSource.includes("from 'pino'")) {
  console.error("hq-app structural failed: app authority seam must not import host logging implementation.");
  process.exit(1);
}

if (!testingSource.includes("createTestingRawrHqManifest")) {
  console.error("hq-app structural failed: testing seam missing.");
  process.exit(1);
}

console.log("hq-app structural verified");
