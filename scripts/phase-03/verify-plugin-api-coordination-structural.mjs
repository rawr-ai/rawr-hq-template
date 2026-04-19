#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const projectPath = path.join(root, "plugins", "api", "coordination", "project.json");
const indexPath = path.join(root, "plugins", "api", "coordination", "src", "index.ts");
const serverPath = path.join(root, "plugins", "api", "coordination", "src", "server.ts");
const routerPath = path.join(root, "plugins", "api", "coordination", "src", "router.ts");

const [projectRaw, indexSource, serverSource, routerSource] = await Promise.all([
  fs.readFile(projectPath, "utf8"),
  fs.readFile(indexPath, "utf8"),
  fs.readFile(serverPath, "utf8"),
  fs.readFile(routerPath, "utf8"),
]);

const project = JSON.parse(projectRaw);
const requiredTags = ["type:plugin", "migration-slice:structural-tranche", "role:api", "surface:orpc", "capability:coordination"];
for (const tag of requiredTags) {
  if (!(project.tags ?? []).includes(tag)) {
    console.error(`plugin-api-coordination structural failed: missing tag ${tag}`);
    process.exit(1);
  }
}

if (
  !indexSource.includes("createCoordinationApiClient")
  || !indexSource.includes("coordinationApiContract")
  || indexSource.includes("registerCoordinationApiPlugin")
) {
  console.error("plugin-api-coordination structural failed: plugin root must stay app-safe and must not register the host ORPC surface.");
  process.exit(1);
}

if (
  !serverSource.includes("defineApiPlugin")
  || !serverSource.includes("internal:")
  || !serverSource.includes("coordinationApiContract")
  || !serverSource.includes("createCoordinationApiRouter(input.resolveClient)")
) {
  console.error("plugin-api-coordination structural failed: plugin server surface must register the ORPC coordination surface.");
  process.exit(1);
}

if (!routerSource.includes("createCoordinationRouter") || routerSource.includes("@rawr/hq-app")) {
  console.error("plugin-api-coordination structural failed: router must remain a thin service projection.");
  process.exit(1);
}

console.log("plugin-api-coordination structural verified");
