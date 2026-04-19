#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const packagePath = path.join(root, "packages", "bootgraph", "package.json");
const sourcePath = path.join(root, "packages", "bootgraph", "src", "index.ts");

const [pkgRaw, source] = await Promise.all([
  fs.readFile(packagePath, "utf8"),
  fs.readFile(sourcePath, "utf8"),
]);

const pkg = JSON.parse(pkgRaw);
const requiredTags = ["type:package", "migration-slice:structural-tranche", "role:support", "surface:bootgraph"];
for (const tag of requiredTags) {
  if (!(pkg.nx?.tags ?? []).includes(tag)) {
    console.error(`bootgraph structural failed: missing tag ${tag}`);
    process.exit(1);
  }
}

if (!source.includes("reserved-support-shell")) {
  console.error("bootgraph structural failed: reservation marker missing.");
  process.exit(1);
}

if (source.includes("@rawr/coordination") || source.includes("@rawr/state") || source.includes("RuntimeRouterContext")) {
  console.error("bootgraph structural failed: bootgraph must remain support-only and not own service/runtime context seams.");
  process.exit(1);
}

console.log("bootgraph structural verified");
