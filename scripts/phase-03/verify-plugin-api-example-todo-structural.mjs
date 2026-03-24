#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const projectPath = path.join(root, "plugins", "api", "example-todo", "project.json");
const indexPath = path.join(root, "plugins", "api", "example-todo", "src", "index.ts");
const routerPath = path.join(root, "plugins", "api", "example-todo", "src", "router.ts");

const project = JSON.parse(await fs.readFile(projectPath, "utf8"));
const indexSource = await fs.readFile(indexPath, "utf8");
const routerSource = await fs.readFile(routerPath, "utf8");

const requiredTags = [
  "type:plugin",
  "migration-slice:structural-tranche",
  "role:api",
  "surface:orpc",
  "capability:example-todo",
];

for (const tag of requiredTags) {
  if (!(project.tags ?? []).includes(tag)) {
    console.error(`plugin-api-example-todo structural failed: missing tag ${tag}`);
    process.exit(1);
  }
}

if (!indexSource.includes('namespace: "orpc"') || !indexSource.includes("exampleTodoApiContract")) {
  console.error("plugin-api-example-todo structural failed: plugin index must register the ORPC example-todo surface.");
  process.exit(1);
}

if (!routerSource.includes("resolveClient(context.repoRoot)")) {
  console.error("plugin-api-example-todo structural failed: router must remain a thin host-client projection.");
  process.exit(1);
}

console.log("plugin-api-example-todo structural verified");
