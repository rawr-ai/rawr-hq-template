#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const serviceRoot = path.join(root, "services", "coordination");
const packagePath = path.join(serviceRoot, "package.json");
const httpPath = path.join(serviceRoot, "src", "http.ts");
const indexPath = path.join(serviceRoot, "src", "index.ts");
const nodePath = path.join(serviceRoot, "src", "node.ts");
const serviceRouterPath = path.join(serviceRoot, "src", "service", "router.ts");
const serviceImplPath = path.join(serviceRoot, "src", "service", "impl.ts");
const serviceObservabilityMiddlewarePath = path.join(serviceRoot, "src", "service", "middleware", "observability.ts");
const serviceAnalyticsMiddlewarePath = path.join(serviceRoot, "src", "service", "middleware", "analytics.ts");
const workflowsRouterPath = path.join(serviceRoot, "src", "service", "modules", "workflows", "router.ts");
const runsRouterPath = path.join(serviceRoot, "src", "service", "modules", "runs", "router.ts");
const authoringIndexPath = path.join(serviceRoot, "src", "authoring", "index.ts");
const tsconfigBasePath = path.join(root, "tsconfig.base.json");

const [
  pkgRaw,
  serviceRouterSource,
  serviceImplSource,
  serviceObservabilityMiddlewareSource,
  serviceAnalyticsMiddlewareSource,
  workflowsRouterSource,
  runsRouterSource,
  authoringIndexSource,
  indexSource,
  nodeSource,
  tsconfigBaseSource,
  httpWrapperExists,
] = await Promise.all([
  fs.readFile(packagePath, "utf8"),
  fs.readFile(serviceRouterPath, "utf8"),
  fs.readFile(serviceImplPath, "utf8"),
  fs.readFile(serviceObservabilityMiddlewarePath, "utf8"),
  fs.readFile(serviceAnalyticsMiddlewarePath, "utf8"),
  fs.readFile(workflowsRouterPath, "utf8"),
  fs.readFile(runsRouterPath, "utf8"),
  fs.readFile(authoringIndexPath, "utf8"),
  fs.readFile(indexPath, "utf8"),
  fs.readFile(nodePath, "utf8"),
  fs.readFile(tsconfigBasePath, "utf8"),
  fs.stat(httpPath).then(() => true).catch(() => false),
]);

const pkg = JSON.parse(pkgRaw);
if (!(pkg.nx?.tags ?? []).includes("migration-slice:structural-tranche")) {
  console.error("coordination structural failed: missing tranche tag.");
  process.exit(1);
}

if (!(pkg.nx?.tags ?? []).includes("type:package")) {
  console.error("coordination structural failed: missing package tag.");
  process.exit(1);
}

for (const scriptName of ["sync", "structural"]) {
  if (!(scriptName in (pkg.scripts ?? {}))) {
    console.error(`coordination structural failed: missing ${scriptName} script.`);
    process.exit(1);
  }
}

if (pkg.exports?.["./orpc"]) {
  console.error("coordination structural failed: package exports must not publish /orpc residue.");
  process.exit(1);
}

if (!pkg.exports?.["./compat/http"]) {
  console.error("coordination structural failed: compatibility HTTP helpers must live behind an explicit ./compat/http subpath.");
  process.exit(1);
}

if (tsconfigBaseSource.includes("@rawr/coordination/orpc")) {
  console.error("coordination structural failed: stale @rawr/coordination/orpc path alias must stay removed.");
  process.exit(1);
}

if (
  serviceRouterSource.includes("./modules/workflows/router") === false
  || serviceRouterSource.includes("./modules/runs/router") === false
  || serviceRouterSource.includes("...workflows") === false
  || serviceRouterSource.includes("...runs") === false
) {
  console.error("coordination structural failed: service router must compose workflow/run module routers.");
  process.exit(1);
}

if (
  !serviceImplSource.includes('from "./middleware/analytics"') ||
  !serviceImplSource.includes('from "./middleware/observability"') ||
  !serviceObservabilityMiddlewareSource.includes("createRequiredServiceObservabilityMiddleware") ||
  !serviceAnalyticsMiddlewareSource.includes("createRequiredServiceAnalyticsMiddleware")
) {
  console.error("coordination structural failed: required service middleware must live in dedicated middleware files.");
  process.exit(1);
}

if (
  workflowsRouterSource.includes("@rawr/core")
  || workflowsRouterSource.includes("apps/server/src")
  || runsRouterSource.includes("@rawr/core")
  || runsRouterSource.includes("apps/server/src")
) {
  console.error("coordination structural failed: service modules must not depend on core or host implementation.");
  process.exit(1);
}

if (!runsRouterSource.includes("RUN_FINALIZATION_CONTRACT_V1")) {
  console.error("coordination structural failed: run module must own queue failure finalization fallback.");
  process.exit(1);
}

if (!indexSource.includes('export { createClient, type Client } from "./client";')) {
  console.error("coordination structural failed: package boundary client seam not exported.");
  process.exit(1);
}

if (!authoringIndexSource.includes('export { createAuthoringClient, type AuthoringClient } from "./client";')) {
  console.error("coordination structural failed: authoring sub-boundary client seam must be exported.");
  process.exit(1);
}

if (!indexSource.includes('export { router, type Router } from "./router";')) {
  console.error("coordination structural failed: package boundary router seam not exported.");
  process.exit(1);
}

if (indexSource.includes("coordinationContract")) {
  console.error("coordination structural failed: package root must not expose service contract truth.");
  process.exit(1);
}

if (indexSource.includes("coordinationFailure") || indexSource.includes("coordinationSuccess")) {
  console.error("coordination structural failed: package root must not expose legacy HTTP-envelope helpers.");
  process.exit(1);
}

if (indexSource.includes("typeBoxStandardSchema")) {
  console.error("coordination structural failed: package root must not re-export generic SDK schema helpers.");
  process.exit(1);
}

if (httpWrapperExists) {
  console.error("coordination structural failed: dead src/http.ts compatibility wrapper must stay removed.");
  process.exit(1);
}

if (nodeSource.includes("validateWorkflow") || nodeSource.includes("normalizeCoordinationId")) {
  console.error("coordination structural failed: node seam must stay storage-only.");
  process.exit(1);
}

console.log("coordination structural verified");
