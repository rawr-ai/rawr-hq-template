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

for (const requiredExport of [
  "export type WorkflowRuntimeSupportSeam",
  "export type BoundaryMiddlewareSupportState",
  "export type HostRuntimeSupportContext",
  "export type BoundaryRequestSupportContext",
]) {
  if (!source.includes(requiredExport)) {
    console.error(`runtime-context structural failed: missing canonical export ${requiredExport}.`);
    process.exit(1);
  }
}

for (const deprecatedExport of [
  "export type WorkflowRuntimeAdapter",
  "export type BoundaryMiddlewareState",
  "export type RuntimeRouterContext",
  "export type RequestBoundaryContext",
]) {
  if (source.includes(deprecatedExport)) {
    console.error(`runtime-context structural failed: deprecated alias survived ${deprecatedExport}.`);
    process.exit(1);
  }
}

if (source.includes("createHqRuntimeRouter") || source.includes("createWorkflowTriggerRuntimeRouter")) {
  console.error("runtime-context structural failed: support seam must stay type-only.");
  process.exit(1);
}

console.log("runtime-context structural verified");
