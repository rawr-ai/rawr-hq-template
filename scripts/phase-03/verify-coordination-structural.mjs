#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const serviceRoot = path.join(root, "services", "coordination");
const packagePath = path.join(serviceRoot, "package.json");
const indexPath = path.join(serviceRoot, "src", "index.ts");
const nodePath = path.join(serviceRoot, "src", "node.ts");
const packageRouterPath = path.join(serviceRoot, "src", "router.ts");
const httpPath = path.join(serviceRoot, "src", "http.ts");
const serviceBasePath = path.join(serviceRoot, "src", "service", "base.ts");
const serviceContractPath = path.join(serviceRoot, "src", "service", "contract.ts");
const serviceRouterPath = path.join(serviceRoot, "src", "service", "router.ts");
const serviceImplPath = path.join(serviceRoot, "src", "service", "impl.ts");
const serviceClientPath = path.join(serviceRoot, "src", "client.ts");
const serviceObservabilityMiddlewarePath = path.join(serviceRoot, "src", "service", "middleware", "observability.ts");
const serviceAnalyticsMiddlewarePath = path.join(serviceRoot, "src", "service", "middleware", "analytics.ts");
const runsModulePath = path.join(serviceRoot, "src", "service", "modules", "runs", "module.ts");
const runsMiddlewarePath = path.join(serviceRoot, "src", "service", "modules", "runs", "middleware.ts");
const workflowsRouterPath = path.join(serviceRoot, "src", "service", "modules", "workflows", "router.ts");
const runsRouterPath = path.join(serviceRoot, "src", "service", "modules", "runs", "router.ts");
const authoringRootPath = path.join(serviceRoot, "src", "authoring");
const tsconfigBasePath = path.join(root, "tsconfig.base.json");

const [
  pkgRaw,
  indexSource,
  nodeSource,
  packageRouterSource,
  serviceBaseSource,
  serviceContractSource,
  serviceRouterSource,
  serviceImplSource,
  serviceClientSource,
  serviceObservabilityMiddlewareSource,
  serviceAnalyticsMiddlewareSource,
  runsModuleSource,
  runsMiddlewareSource,
  workflowsRouterSource,
  runsRouterSource,
  tsconfigBaseSource,
  authoringExists,
  httpWrapperExists,
] = await Promise.all([
  fs.readFile(packagePath, "utf8"),
  fs.readFile(indexPath, "utf8"),
  fs.readFile(nodePath, "utf8"),
  fs.readFile(packageRouterPath, "utf8"),
  fs.readFile(serviceBasePath, "utf8"),
  fs.readFile(serviceContractPath, "utf8"),
  fs.readFile(serviceRouterPath, "utf8"),
  fs.readFile(serviceImplPath, "utf8"),
  fs.readFile(serviceClientPath, "utf8"),
  fs.readFile(serviceObservabilityMiddlewarePath, "utf8"),
  fs.readFile(serviceAnalyticsMiddlewarePath, "utf8"),
  fs.readFile(runsModulePath, "utf8"),
  fs.readFile(runsMiddlewarePath, "utf8"),
  fs.readFile(workflowsRouterPath, "utf8"),
  fs.readFile(runsRouterPath, "utf8"),
  fs.readFile(tsconfigBasePath, "utf8"),
  fs.stat(authoringRootPath).then(() => true).catch(() => false),
  fs.stat(httpPath).then(() => true).catch(() => false),
]);

const pkg = JSON.parse(pkgRaw);
const tags = pkg.nx?.tags ?? [];

if (!tags.includes("migration-slice:structural-tranche")) {
  console.error("coordination structural failed: missing tranche tag.");
  process.exit(1);
}

if (!tags.includes("type:service")) {
  console.error("coordination structural failed: missing service tag.");
  process.exit(1);
}

if (!tags.includes("role:servicepackage")) {
  console.error("coordination structural failed: missing servicepackage role tag.");
  process.exit(1);
}

if (tags.includes("type:package")) {
  console.error("coordination structural failed: coordination must be tagged as a service, not a package.");
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

if (pkg.exports?.["./authoring"]) {
  console.error("coordination structural failed: public authoring residue must stay removed.");
  process.exit(1);
}

for (const exportKey of [
  "./compat/http",
  "./domain/schemas",
  "./service/modules/runs/schemas",
  "./service/modules/workflows/schemas",
]) {
  if (!pkg.exports?.[exportKey]) {
    console.error(`coordination structural failed: missing required export ${exportKey}.`);
    process.exit(1);
  }
}

if (authoringExists) {
  console.error("coordination structural failed: src/authoring residue must stay removed.");
  process.exit(1);
}

if (tsconfigBaseSource.includes("@rawr/coordination/orpc")) {
  console.error("coordination structural failed: stale @rawr/coordination/orpc path alias must stay removed.");
  process.exit(1);
}

if (!/export const contract = \{\s*workflows,\s*runs,\s*\};/s.test(serviceContractSource)) {
  console.error("coordination structural failed: service contract must keep canonical nested truth as { workflows, runs }.");
  process.exit(1);
}

for (const forbiddenSchemaExport of [
  "QueueRunInputSchema",
  "GetWorkflowInputSchema",
  "RunStatusSchema",
  "ValidationResultSchema",
]) {
  if (serviceContractSource.includes(forbiddenSchemaExport)) {
    console.error("coordination structural failed: service contract must not act as a schema barrel.");
    process.exit(1);
  }
}

if (!/export const router = impl\.router\(\{\s*workflows,\s*runs,\s*\}\);/s.test(serviceRouterSource)) {
  console.error("coordination structural failed: service router must compose the canonical nested { workflows, runs } tree.");
  process.exit(1);
}

if (!packageRouterSource.includes('export { router, type Router } from "./service/router";')) {
  console.error("coordination structural failed: package router seam must stay a thin re-export of the canonical service router.");
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

if (!serviceBaseSource.includes("runsRuntime: CoordinationRunsRuntime")) {
  console.error("coordination structural failed: run dispatch capability must be declared in service deps.");
  process.exit(1);
}

if (!serviceClientSource.includes("const servicePackage = defineServicePackage(router);")) {
  console.error("coordination structural failed: client must use defineServicePackage(router).");
  process.exit(1);
}

if (!serviceClientSource.includes("return servicePackage.createClient(boundary);")) {
  console.error("coordination structural failed: client must delegate to the canonical service package shell.");
  process.exit(1);
}

if (
  serviceClientSource.includes("createRouterClient(") ||
  serviceClientSource.includes("InferInvocation") ||
  serviceClientSource.includes("runs: {") ||
  serviceClientSource.includes("provided:")
) {
  console.error("coordination structural failed: client must not keep the custom runtime projection seam.");
  process.exit(1);
}

if (!runsMiddlewareSource.includes("context.deps.runsRuntime")) {
  console.error("coordination structural failed: run execution provider must source runtime from context.deps.");
  process.exit(1);
}

if (runsMiddlewareSource.includes("context.provided.runsRuntime")) {
  console.error("coordination structural failed: run execution provider must not read runtime from provided.");
  process.exit(1);
}

if (
  !runsModuleSource.includes("export const readModule = baseModule") ||
  !runsModuleSource.includes("export const queueRunModule = baseModule")
) {
  console.error("coordination structural failed: runs module must split read and queue composition.");
  process.exit(1);
}

if (!runsModuleSource.includes("queueRunModule = baseModule\n  .use(runExecution)")) {
  console.error("coordination structural failed: queue run composition must keep local run-execution provider attachment.");
  process.exit(1);
}

if (runsModuleSource.includes("readModule = baseModule\n  .use(runExecution)")) {
  console.error("coordination structural failed: read run composition must not require run execution.");
  process.exit(1);
}

if (
  !runsRouterSource.includes("queueRunModule.queueRun.handler") ||
  !runsRouterSource.includes("readModule.getRunStatus.handler") ||
  !runsRouterSource.includes("readModule.getRunTimeline.handler")
) {
  console.error("coordination structural failed: runs router must keep queue and read handlers on their split module seams.");
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
