#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const packagePath = path.join(root, "packages", "runtime-context", "package.json");
const sourcePath = path.join(root, "packages", "runtime-context", "src", "index.ts");

const [pkgRaw, source] = await Promise.all([
  fs.readFile(packagePath, "utf8"),
  fs.readFile(sourcePath, "utf8"),
]);

const pkg = JSON.parse(pkgRaw);
const requiredTags = ["type:package", "migration-slice:structural-tranche", "role:support", "surface:runtime-context"];
for (const tag of requiredTags) {
  if (!(pkg.nx?.tags ?? []).includes(tag)) {
    console.error(`runtime-context structural failed: missing tag ${tag}`);
    process.exit(1);
  }
}

if (!source.includes("export type RuntimeRouterContext")) {
  console.error("runtime-context structural failed: RuntimeRouterContext export missing.");
  process.exit(1);
}

if (source.includes("createHqRuntimeRouter") || source.includes("createWorkflowTriggerRuntimeRouter")) {
  console.error("runtime-context structural failed: support seam must stay type-only.");
  process.exit(1);
}

console.log("runtime-context structural verified");
