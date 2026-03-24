#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const packagePath = path.join(root, "packages", "coordination", "package.json");
const routerPath = path.join(root, "packages", "coordination", "src", "orpc", "router.ts");
const indexPath = path.join(root, "packages", "coordination", "src", "orpc", "index.ts");

const [pkgRaw, routerSource, indexSource] = await Promise.all([
  fs.readFile(packagePath, "utf8"),
  fs.readFile(routerPath, "utf8"),
  fs.readFile(indexPath, "utf8"),
]);

const pkg = JSON.parse(pkgRaw);
if (!(pkg.nx?.tags ?? []).includes("migration-slice:structural-tranche")) {
  console.error("coordination structural failed: missing tranche tag.");
  process.exit(1);
}

for (const scriptName of ["sync", "structural"]) {
  if (!(scriptName in (pkg.scripts ?? {}))) {
    console.error(`coordination structural failed: missing ${scriptName} script.`);
    process.exit(1);
  }
}

if (!routerSource.includes("export function createCoordinationRouter")) {
  console.error("coordination structural failed: service-owned router seam missing.");
  process.exit(1);
}

if (routerSource.includes("@rawr/core") || routerSource.includes("apps/server/src")) {
  console.error("coordination structural failed: router seam must not depend on core or host implementation.");
  process.exit(1);
}

if (!indexSource.includes('export * from "./router"')) {
  console.error("coordination structural failed: router seam not exported.");
  process.exit(1);
}

console.log("coordination structural verified");
