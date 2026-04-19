#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const projectPath = path.join(root, "plugins", "server", "api", "example-todo", "project.json");
const indexPath = path.join(root, "plugins", "server", "api", "example-todo", "src", "index.ts");
const serverPath = path.join(root, "plugins", "server", "api", "example-todo", "src", "server.ts");
const routerPath = path.join(root, "plugins", "server", "api", "example-todo", "src", "router.ts");

const project = JSON.parse(await fs.readFile(projectPath, "utf8"));
const indexSource = await fs.readFile(indexPath, "utf8");
const serverSource = await fs.readFile(serverPath, "utf8");
const routerSource = await fs.readFile(routerPath, "utf8");

const requiredTags = [
  "type:plugin",
  "migration-slice:structural-tranche",
  "role:server",
  "surface:api",
  "capability:example-todo",
];

for (const tag of requiredTags) {
  if (!(project.tags ?? []).includes(tag)) {
    console.error(`plugin-server-api-example-todo structural failed: missing tag ${tag}`);
    process.exit(1);
  }
}

if (!indexSource.includes("exampleTodoApiContract") || indexSource.includes("registerExampleTodoApiPlugin")) {
  console.error("plugin-server-api-example-todo structural failed: src/index.ts must stay app-safe and export the example-todo contract only.");
  process.exit(1);
}

if (!serverSource.includes("defineApiPlugin") || !serverSource.includes("exampleTodoApiContract")) {
  console.error("plugin-server-api-example-todo structural failed: src/server.ts must register the example-todo API plugin through defineApiPlugin.");
  process.exit(1);
}

if (!routerSource.includes("resolveClient(context.repoRoot)")) {
  console.error("plugin-server-api-example-todo structural failed: router must remain a thin host-client projection.");
  process.exit(1);
}

console.log("plugin-server-api-example-todo structural verified");
