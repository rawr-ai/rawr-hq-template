#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const packagePath = path.join(root, "packages", "state", "package.json");
const routerPath = path.join(root, "packages", "state", "src", "orpc", "router.ts");
const contractPath = path.join(root, "packages", "state", "src", "orpc", "contract.ts");
const indexPath = path.join(root, "packages", "state", "src", "orpc", "index.ts");

const [pkgRaw, routerSource, contractSource, indexSource] = await Promise.all([
  fs.readFile(packagePath, "utf8"),
  fs.readFile(routerPath, "utf8"),
  fs.readFile(contractPath, "utf8"),
  fs.readFile(indexPath, "utf8"),
]);

const pkg = JSON.parse(pkgRaw);
if (!(pkg.nx?.tags ?? []).includes("migration-slice:structural-tranche")) {
  console.error("state structural failed: missing tranche tag.");
  process.exit(1);
}

for (const scriptName of ["sync", "structural"]) {
  if (!(scriptName in (pkg.scripts ?? {}))) {
    console.error(`state structural failed: missing ${scriptName} script.`);
    process.exit(1);
  }
}

if (!routerSource.includes("export function createStateRouter")) {
  console.error("state structural failed: service-owned router seam missing.");
  process.exit(1);
}

if (!contractSource.includes("authorityRepoRoot")) {
  console.error("state structural failed: authority metadata contract missing.");
  process.exit(1);
}

if (routerSource.includes("@rawr/core") || routerSource.includes("apps/server/src")) {
  console.error("state structural failed: router seam must not depend on core or host implementation.");
  process.exit(1);
}

if (!indexSource.includes('export * from "./router"')) {
  console.error("state structural failed: router seam not exported.");
  process.exit(1);
}

console.log("state structural verified");
