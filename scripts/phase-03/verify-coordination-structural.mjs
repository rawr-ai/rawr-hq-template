#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const coordinationRoot = path.join(root, "services", "coordination");
const workflowPluginRoot = path.join(root, "plugins", "workflows", "coordination");
const tsconfigBasePath = path.join(root, "tsconfig.base.json");

function fail(message) {
  console.error(`coordination structural failed: ${message}`);
  process.exit(1);
}

async function readFile(filePath) {
  return await fs.readFile(filePath, "utf8");
}

async function exists(filePath) {
  return await fs
    .stat(filePath)
    .then(() => true)
    .catch(() => false);
}

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
  workflowsRouterSource,
  pluginContractSource,
  pluginRouterSource,
  pluginContextSource,
  pluginServerSource,
  tsconfigBaseSource,
  authoringExists,
  httpWrapperExists,
  serviceRunsExists,
  projectionBridgeExists,
] = await Promise.all([
  readFile(path.join(coordinationRoot, "package.json")),
  readFile(path.join(coordinationRoot, "src", "index.ts")),
  readFile(path.join(coordinationRoot, "src", "node.ts")),
  readFile(path.join(coordinationRoot, "src", "router.ts")),
  readFile(path.join(coordinationRoot, "src", "service", "base.ts")),
  readFile(path.join(coordinationRoot, "src", "service", "contract.ts")),
  readFile(path.join(coordinationRoot, "src", "service", "router.ts")),
  readFile(path.join(coordinationRoot, "src", "service", "impl.ts")),
  readFile(path.join(coordinationRoot, "src", "client.ts")),
  readFile(path.join(coordinationRoot, "src", "service", "middleware", "observability.ts")),
  readFile(path.join(coordinationRoot, "src", "service", "middleware", "analytics.ts")),
  readFile(path.join(coordinationRoot, "src", "service", "modules", "workflows", "router.ts")),
  readFile(path.join(workflowPluginRoot, "src", "contract.ts")),
  readFile(path.join(workflowPluginRoot, "src", "router.ts")),
  readFile(path.join(workflowPluginRoot, "src", "context.ts")),
  readFile(path.join(workflowPluginRoot, "src", "server.ts")),
  readFile(tsconfigBasePath),
  exists(path.join(coordinationRoot, "src", "authoring")),
  exists(path.join(coordinationRoot, "src", "http.ts")),
  exists(path.join(coordinationRoot, "src", "service", "modules", "runs")),
  exists(path.join(workflowPluginRoot, "src", "projection-bridge.ts")),
]);

const pkg = JSON.parse(pkgRaw);
const tags = pkg.nx?.tags ?? [];

for (const tag of ["migration-slice:structural-tranche", "type:service", "role:servicepackage"]) {
  if (!tags.includes(tag)) {
    fail(`missing tag ${tag}.`);
  }
}

if (tags.includes("type:package")) {
  fail("coordination must be tagged as a service, not a package.");
}

for (const scriptName of ["sync", "structural"]) {
  if (!(scriptName in (pkg.scripts ?? {}))) {
    fail(`missing ${scriptName} script.`);
  }
}

if (pkg.exports?.["./orpc"]) {
  fail("package exports must not publish /orpc residue.");
}

if (pkg.exports?.["./authoring"]) {
  fail("public authoring residue must stay removed.");
}

for (const exportKey of [
  "./compat/http",
  "./domain/schemas",
  "./service/modules/workflows/schemas",
]) {
  if (!pkg.exports?.[exportKey]) {
    fail(`missing required export ${exportKey}.`);
  }
}

if (pkg.exports?.["./service/modules/runs/schemas"]) {
  fail("service package must not export run schemas once the workflow plugin owns that surface.");
}

if (authoringExists) {
  fail("src/authoring residue must stay removed.");
}

if (tsconfigBaseSource.includes("@rawr/coordination/orpc")) {
  fail("stale @rawr/coordination/orpc path alias must stay removed.");
}

if (!/export const contract = \{\s*workflows,\s*\};/s.test(serviceContractSource)) {
  fail("service contract must keep canonical truth narrowed to { workflows }.");
}

if (/queueRun|getRunStatus|getRunTimeline/.test(serviceContractSource)) {
  fail("service contract must not expose run procedures.");
}

for (const forbiddenSchemaExport of [
  "QueueRunInputSchema",
  "GetWorkflowInputSchema",
  "RunStatusSchema",
  "ValidationResultSchema",
]) {
  if (serviceContractSource.includes(forbiddenSchemaExport)) {
    fail("service contract must not act as a schema barrel.");
  }
}

if (!/export const router = impl\.router\(\{\s*workflows,\s*\}\);/s.test(serviceRouterSource)) {
  fail("service router must compose the canonical { workflows } tree.");
}

if (!packageRouterSource.includes('export { router, type Router } from "./service/router";')) {
  fail("package router seam must stay a thin re-export of the canonical service router.");
}

if (
  !serviceImplSource.includes('from "./middleware/analytics"') ||
  !serviceImplSource.includes('from "./middleware/observability"') ||
  !serviceObservabilityMiddlewareSource.includes("createRequiredServiceObservabilityMiddleware") ||
  !serviceAnalyticsMiddlewareSource.includes("createRequiredServiceAnalyticsMiddleware")
) {
  fail("required service middleware must live in dedicated middleware files.");
}

if (serviceBaseSource.includes("runsRuntime") || serviceBaseSource.includes("CoordinationRunsRuntime")) {
  fail("service base must not declare run runtime ownership.");
}

if (!serviceClientSource.includes("const servicePackage = defineServicePackage(router);")) {
  fail("client must use defineServicePackage(router).");
}

if (!serviceClientSource.includes("return servicePackage.createClient(boundary);")) {
  fail("client must delegate to the canonical service package shell.");
}

if (
  serviceClientSource.includes("createRouterClient(") ||
  serviceClientSource.includes("InferInvocation") ||
  serviceClientSource.includes("runs: {") ||
  serviceClientSource.includes("provided:")
) {
  fail("client must not keep custom runtime projection seams.");
}

if (serviceRunsExists) {
  fail("service/modules/runs residue must be removed once workflow plugin owns the run surface.");
}

if (
  workflowsRouterSource.includes("@rawr/core") ||
  workflowsRouterSource.includes("apps/server/src")
) {
  fail("service workflow module must not depend on core or host implementation.");
}

if (!pluginContractSource.includes('path: "/coordination/workflows/{workflowId}/run"')) {
  fail("workflow plugin contract must own the queue run route.");
}

if (
  !pluginContractSource.includes('operationId: "coordinationWorkflowQueueRun"') ||
  !pluginContractSource.includes('operationId: "coordinationWorkflowGetRunStatus"') ||
  !pluginContractSource.includes('operationId: "coordinationWorkflowGetRunTimeline"')
) {
  fail("workflow plugin contract must keep published run operation ids stable.");
}

if (pluginContractSource.includes("@rawr/coordination/service/contract")) {
  fail("workflow plugin contract must not derive run routes from the service contract.");
}

if (
  !pluginRouterSource.includes("queueCoordinationRunWithInngest") ||
  !pluginRouterSource.includes("resolveAuthoringClient(context.repoRoot)") ||
  !pluginRouterSource.includes("context.runtime.getRunStatus") ||
  !pluginRouterSource.includes("context.runtime.getRunTimeline(runId)") ||
  !pluginRouterSource.includes("RUN_FINALIZATION_CONTRACT_V1")
) {
  fail("workflow plugin router must own queue/status/timeline handling directly.");
}

if (
  pluginRouterSource.includes("createCoordinationWorkflowProjectionClient") ||
  pluginRouterSource.includes("projection-bridge") ||
  pluginRouterSource.includes("@rawr/coordination/node")
) {
  fail("workflow plugin router must not forward run routes through the service client bridge or node backdoors.");
}

if (
  pluginRouterSource.includes("@rawr/core") ||
  pluginRouterSource.includes("apps/server/src")
) {
  fail("workflow plugin router must stay host-agnostic.");
}

if (
  !pluginContextSource.includes("CoordinationWorkflowAuthoringClientResolver") ||
  !pluginContextSource.includes('CoordinationClient["workflows"]')
) {
  fail("workflow plugin context must declare a narrow coordination workflow authoring client resolver.");
}

if (
  pluginContextSource.includes("createEmbeddedPlaceholder") ||
  pluginContextSource.includes('createClient({')
) {
  fail("workflow plugin context must not synthesize placeholder-backed coordination clients.");
}

if (projectionBridgeExists) {
  fail("projection-bridge residue must be removed once the workflow plugin owns the run surface.");
}

if (
  !pluginServerSource.includes("GetRunStatusInputSchema") ||
  !pluginServerSource.includes("QueueRunInputSchema") ||
  !pluginServerSource.includes("options.resolveAuthoringClient") ||
  !pluginServerSource.includes("getRunTimeline: async (runId) => getRunTimeline(input.repoRoot, runId)")
) {
  fail("workflow plugin server surface must re-export run schemas and own runtime/authoring composition.");
}

if (!indexSource.includes('export { createClient, type Client } from "./client";')) {
  fail("package boundary client seam not exported.");
}

if (!indexSource.includes('export { router, type Router } from "./router";')) {
  fail("package boundary router seam not exported.");
}

if (indexSource.includes("coordinationContract")) {
  fail("package root must not expose service contract truth.");
}

if (indexSource.includes("coordinationFailure") || indexSource.includes("coordinationSuccess")) {
  fail("package root must not expose legacy HTTP-envelope helpers.");
}

if (indexSource.includes("typeBoxStandardSchema")) {
  fail("package root must not re-export generic SDK schema helpers.");
}

if (httpWrapperExists) {
  fail("dead src/http.ts compatibility wrapper must stay removed.");
}

if (nodeSource.includes("validateWorkflow") || nodeSource.includes("normalizeCoordinationId")) {
  fail("node seam must stay storage-only.");
}

console.log("coordination structural verified");
