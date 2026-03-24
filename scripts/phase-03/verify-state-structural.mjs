#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const packagePath = path.join(root, "services", "state", "package.json");
const basePath = path.join(root, "services", "state", "src", "service", "base.ts");
const implPath = path.join(root, "services", "state", "src", "service", "impl.ts");
const observabilityMiddlewarePath = path.join(root, "services", "state", "src", "service", "middleware", "observability.ts");
const analyticsMiddlewarePath = path.join(root, "services", "state", "src", "service", "middleware", "analytics.ts");
const routerPath = path.join(root, "services", "state", "src", "service", "router.ts");
const contractPath = path.join(root, "services", "state", "src", "service", "contract.ts");
const moduleRouterPath = path.join(root, "services", "state", "src", "service", "modules", "state", "router.ts");
const moduleContractPath = path.join(root, "services", "state", "src", "service", "modules", "state", "contract.ts");
const indexPath = path.join(root, "services", "state", "src", "index.ts");
const repoStateIndexPath = path.join(root, "services", "state", "src", "repo-state", "index.ts");

const [pkgRaw, baseSource, implSource, observabilityMiddlewareSource, analyticsMiddlewareSource, routerSource, contractSource, moduleRouterSource, moduleContractSource, indexSource, repoStateIndexSource] = await Promise.all([
  fs.readFile(packagePath, "utf8"),
  fs.readFile(basePath, "utf8"),
  fs.readFile(implPath, "utf8"),
  fs.readFile(observabilityMiddlewarePath, "utf8"),
  fs.readFile(analyticsMiddlewarePath, "utf8"),
  fs.readFile(routerPath, "utf8"),
  fs.readFile(contractPath, "utf8"),
  fs.readFile(moduleRouterPath, "utf8"),
  fs.readFile(moduleContractPath, "utf8"),
  fs.readFile(indexPath, "utf8"),
  fs.readFile(repoStateIndexPath, "utf8"),
]);

const pkg = JSON.parse(pkgRaw);
const tags = pkg.nx?.tags ?? [];

if (!tags.includes("migration-slice:structural-tranche")) {
  console.error("state structural failed: missing tranche tag.");
  process.exit(1);
}

if (!tags.includes("type:service")) {
  console.error("state structural failed: missing service tag.");
  process.exit(1);
}

if (!tags.includes("role:servicepackage")) {
  console.error("state structural failed: missing servicepackage role tag.");
  process.exit(1);
}

if (tags.includes("type:package")) {
  console.error("state structural failed: state must be tagged as a service, not a package.");
  process.exit(1);
}

for (const scriptName of ["sync", "structural"]) {
  if (!(scriptName in (pkg.scripts ?? {}))) {
    console.error(`state structural failed: missing ${scriptName} script.`);
    process.exit(1);
  }
}

if (!routerSource.includes("export const router")) {
  console.error("state structural failed: service-owned router seam missing.");
  process.exit(1);
}

if (
  !routerSource.includes('from "./modules/state/router"')
  || !routerSource.includes("state,")
  || routerSource.includes("...state")
) {
  console.error("state structural failed: root router seam must stay composition-only over the state module.");
  process.exit(1);
}

if (
  !baseSource.includes("type InvocationContext = {") ||
  !baseSource.includes("traceId: string;") ||
  !baseSource.includes("export const createServiceMiddleware = service.createMiddleware;") ||
  !baseSource.includes("export const createServiceProvider = service.createProvider;")
) {
  console.error("state structural failed: service base seam must expose the golden authoring surface and invocation trace lane.");
  process.exit(1);
}

if (
  !implSource.includes('from "./middleware/analytics"') ||
  !implSource.includes('from "./middleware/observability"') ||
  !observabilityMiddlewareSource.includes("createRequiredServiceObservabilityMiddleware") ||
  !analyticsMiddlewareSource.includes("createRequiredServiceAnalyticsMiddleware")
) {
  console.error("state structural failed: required service middleware must live in dedicated middleware files.");
  process.exit(1);
}

if (
  !contractSource.includes('from "./modules/state/contract"')
  || !contractSource.includes("state,")
  || contractSource.includes("GetStateOutputSchema")
  || !moduleContractSource.includes("authorityRepoRoot")
) {
  console.error("state structural failed: authority metadata contract missing.");
  process.exit(1);
}

if (!pkg.exports?.["./service/modules/state/contract"]) {
  console.error("state structural failed: module contract export missing.");
  process.exit(1);
}

if (
  routerSource.includes("@rawr/core")
  || routerSource.includes("apps/server/src")
  || moduleRouterSource.includes("@rawr/core")
  || moduleRouterSource.includes("apps/server/src")
) {
  console.error("state structural failed: router seam must not depend on core or host implementation.");
  process.exit(1);
}

if (!indexSource.includes('export { router, type Router } from "./router"')) {
  console.error("state structural failed: router seam not exported.");
  process.exit(1);
}

if (indexSource.includes("getRepoState") || indexSource.includes("enablePlugin") || indexSource.includes("RepoState")) {
  console.error("state structural failed: package root must stay thin and not export repo-state support helpers.");
  process.exit(1);
}

if (!repoStateIndexSource.includes("getRepoState") || !repoStateIndexSource.includes("enablePlugin")) {
  console.error("state structural failed: repo-state support subpath is incomplete.");
  process.exit(1);
}

console.log("state structural verified");
