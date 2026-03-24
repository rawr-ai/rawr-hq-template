#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const projectPath = path.join(root, "plugins", "api", "state", "project.json");
const contextPath = path.join(root, "plugins", "api", "state", "src", "context.ts");
const indexPath = path.join(root, "plugins", "api", "state", "src", "index.ts");
const serverPath = path.join(root, "plugins", "api", "state", "src", "server.ts");
const routerPath = path.join(root, "plugins", "api", "state", "src", "router.ts");

const [projectRaw, contextSource, indexSource, serverSource, routerSource] = await Promise.all([
  fs.readFile(projectPath, "utf8"),
  fs.readFile(contextPath, "utf8"),
  fs.readFile(indexPath, "utf8"),
  fs.readFile(serverPath, "utf8"),
  fs.readFile(routerPath, "utf8"),
]);

const project = JSON.parse(projectRaw);
const requiredTags = ["type:plugin", "migration-slice:structural-tranche", "role:api", "surface:orpc", "capability:state"];
for (const tag of requiredTags) {
  if (!(project.tags ?? []).includes(tag)) {
    console.error(`plugin-api-state structural failed: missing tag ${tag}`);
    process.exit(1);
  }
}

if (!indexSource.includes("createStateApiClient") || !indexSource.includes("stateApiContract") || indexSource.includes("registerStateApiPlugin")) {
  console.error("plugin-api-state structural failed: plugin root must stay app-safe and must not register the host ORPC state surface.");
  process.exit(1);
}

if (
  !serverSource.includes("defineApiPlugin")
  || !serverSource.includes("internal:")
  || !serverSource.includes("stateApiContract")
  || !serverSource.includes("createStateRouter(input.resolveClient)")
) {
  console.error("plugin-api-state structural failed: plugin server surface must register the ORPC state surface.");
  process.exit(1);
}

if (!contextSource.includes("type StateClientResolver")) {
  console.error("plugin-api-state structural failed: plugin must declare an explicit runtime client resolver seam.");
  process.exit(1);
}

if (
  !serverSource.includes("resolveClient") ||
  !routerSource.includes("resolveClient(context.repoRoot)") ||
  !routerSource.includes("traceId: context.correlationId") ||
  routerSource.includes("@rawr/hq-app")
) {
  console.error("plugin-api-state structural failed: router must remain a thin service projection.");
  process.exit(1);
}

console.log("plugin-api-state structural verified");
