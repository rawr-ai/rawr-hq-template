#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";
import { assertCondition, pathExists, readFile, readJson } from "../phase-1/_verify-utils.mjs";

const REQUIRED_PATHS = [
  "services/agent-config-sync/package.json",
  "services/agent-config-sync/tsconfig.json",
  "services/agent-config-sync/tsconfig.build.json",
  "services/agent-config-sync/src/index.ts",
  "services/agent-config-sync/src/client.ts",
  "services/agent-config-sync/src/router.ts",
  "services/agent-config-sync/src/service/base.ts",
  "services/agent-config-sync/src/service/contract.ts",
  "services/agent-config-sync/src/service/impl.ts",
  "services/agent-config-sync/src/service/router.ts",
  "services/agent-config-sync/src/service/shared/README.md",
  "services/agent-config-sync/src/service/shared/errors.ts",
  "services/agent-config-sync/src/service/shared/internal-errors.ts",
  "services/agent-config-sync/src/service/shared/resources.ts",
  "services/agent-config-sync/src/service/shared/schemas.ts",
  "services/agent-config-sync/src/service/shared/internal/source-scope.ts",
  "services/agent-config-sync/src/service/modules/source-content/entities.ts",
  "services/agent-config-sync/src/service/modules/source-content/helpers/composed-tools.ts",
  "services/agent-config-sync/src/service/modules/source-content/helpers/manifest.ts",
  "services/agent-config-sync/src/service/modules/source-content/helpers/merge-content.ts",
  "services/agent-config-sync/src/service/modules/source-content/helpers/provider-content.ts",
  "services/agent-config-sync/src/service/modules/source-content/helpers/scan-content.ts",
  "services/agent-config-sync/src/service/modules/source-content/helpers/source-plugin-content.ts",
  "services/agent-config-sync/src/service/modules/execution/marketplace-claude.ts",
  "services/agent-config-sync/src/service/modules/execution/registry-codex.ts",
  "services/agent-config-sync/src/service/modules/execution/helpers/claude-target.ts",
  "services/agent-config-sync/src/service/modules/execution/helpers/codex-target.ts",
  "services/agent-config-sync/src/service/modules/execution/helpers/destination-files.ts",
  "services/agent-config-sync/src/service/modules/execution/helpers/sync-results.ts",
  "services/agent-config-sync/src/service/modules/planning/contract.ts",
  "services/agent-config-sync/src/service/modules/planning/helpers/assessment-summary.ts",
  "services/agent-config-sync/src/service/modules/planning/helpers/full-sync-policy.ts",
  "services/agent-config-sync/src/service/modules/planning/helpers/source-plugins.ts",
  "services/agent-config-sync/src/service/modules/planning/helpers/target-homes.ts",
  "services/agent-config-sync/src/service/modules/planning/helpers/workspace-discovery.ts",
  "services/agent-config-sync/src/service/modules/planning/helpers/workspace-roots.ts",
  "services/agent-config-sync/src/service/modules/planning/middleware.ts",
  "services/agent-config-sync/src/service/modules/planning/module.ts",
  "services/agent-config-sync/src/service/modules/planning/router.ts",
  "services/agent-config-sync/src/service/modules/execution/contract.ts",
  "services/agent-config-sync/src/service/modules/execution/middleware.ts",
  "services/agent-config-sync/src/service/modules/execution/module.ts",
  "services/agent-config-sync/src/service/modules/execution/router.ts",
  "services/agent-config-sync/src/service/modules/retirement/contract.ts",
  "services/agent-config-sync/src/service/modules/retirement/helpers/claude-stale-managed.ts",
  "services/agent-config-sync/src/service/modules/retirement/helpers/codex-stale-managed.ts",
  "services/agent-config-sync/src/service/modules/retirement/helpers/filesystem-actions.ts",
  "services/agent-config-sync/src/service/modules/retirement/helpers/managed-source.ts",
  "services/agent-config-sync/src/service/modules/retirement/middleware.ts",
  "services/agent-config-sync/src/service/modules/retirement/module.ts",
  "services/agent-config-sync/src/service/modules/retirement/router.ts",
  "services/agent-config-sync/src/service/modules/undo/contract.ts",
  "services/agent-config-sync/src/service/modules/undo/entities.ts",
  "services/agent-config-sync/src/service/modules/undo/helpers/apply-operation.ts",
  "services/agent-config-sync/src/service/modules/undo/helpers/capsule-paths.ts",
  "services/agent-config-sync/src/service/modules/undo/helpers/capsule-store.ts",
  "services/agent-config-sync/src/service/modules/undo/helpers/capture.ts",
  "services/agent-config-sync/src/service/modules/undo/helpers/command-expiration.ts",
  "services/agent-config-sync/src/service/modules/undo/helpers/path-snapshots.ts",
  "services/agent-config-sync/src/service/modules/undo/middleware.ts",
  "services/agent-config-sync/src/service/modules/undo/module.ts",
  "services/agent-config-sync/src/service/modules/undo/router.ts",
  "services/agent-config-sync/test/helpers.ts",
  "services/agent-config-sync/test/service-shape.test.ts",
];

for (const relPath of REQUIRED_PATHS) {
  assertCondition(await pathExists(relPath), `missing required agent-config-sync path: ${relPath}`);
}

const pkg = await readJson("services/agent-config-sync/package.json");
assertCondition(pkg.name === "@rawr/agent-config-sync", `expected package name @rawr/agent-config-sync, got ${pkg.name}`);
assertCondition((pkg.nx?.tags ?? []).includes("type:service"), "agent-config-sync must be tagged as a service");
assertCondition((pkg.nx?.tags ?? []).includes("role:servicepackage"), "agent-config-sync must be tagged as a servicepackage");

const exportsMap = pkg.exports ?? {};
for (const key of [".", "./client", "./service/contract", "./router"]) {
  assertCondition(exportsMap[key], `agent-config-sync package exports must include ${key}`);
}

const [
  contractSource,
  routerSource,
  clientSource,
  sharedReadme,
  serviceShapeTest,
  baseSource,
  sharedResources,
  executionContract,
  executionRouter,
  executionMiddleware,
  executionModule,
  planningMiddleware,
  planningModule,
  retirementMiddleware,
  retirementModule,
  undoMiddleware,
  undoModule,
  sharedSchemas,
  pluginPluginsPackageJson,
] = await Promise.all([
  readFile("services/agent-config-sync/src/service/contract.ts"),
  readFile("services/agent-config-sync/src/service/router.ts"),
  readFile("services/agent-config-sync/src/client.ts"),
  readFile("services/agent-config-sync/src/service/shared/README.md"),
  readFile("services/agent-config-sync/test/service-shape.test.ts"),
  readFile("services/agent-config-sync/src/service/base.ts"),
  readFile("services/agent-config-sync/src/service/shared/resources.ts"),
  readFile("services/agent-config-sync/src/service/modules/execution/contract.ts"),
  readFile("services/agent-config-sync/src/service/modules/execution/router.ts"),
  readFile("services/agent-config-sync/src/service/modules/execution/middleware.ts"),
  readFile("services/agent-config-sync/src/service/modules/execution/module.ts"),
  readFile("services/agent-config-sync/src/service/modules/planning/middleware.ts"),
  readFile("services/agent-config-sync/src/service/modules/planning/module.ts"),
  readFile("services/agent-config-sync/src/service/modules/retirement/middleware.ts"),
  readFile("services/agent-config-sync/src/service/modules/retirement/module.ts"),
  readFile("services/agent-config-sync/src/service/modules/undo/middleware.ts"),
  readFile("services/agent-config-sync/src/service/modules/undo/module.ts"),
  readFile("services/agent-config-sync/src/service/shared/schemas.ts"),
  readFile("plugins/cli/plugins/package.json"),
]);

for (const key of ["planning", "execution", "retirement", "undo"]) {
  assertCondition(contractSource.includes(`  ${key},`) || contractSource.includes(`\n  ${key},`), `root contract is missing ${key}`);
  assertCondition(routerSource.includes(`  ${key},`) || routerSource.includes(`\n  ${key},`), `root router is missing ${key}`);
  assertCondition(serviceShapeTest.includes(`"${key}"`), `service-shape test must ratchet ${key}`);
}

assertCondition(baseSource.includes("resources: AgentConfigSyncResources"), "agent-config-sync base deps must declare concrete resource deps");
assertCondition(!sharedResources.includes("sources:"), "agent-config-sync resources must not expose semantic sources ports");
assertCondition(!sharedResources.includes("readProviderOverlay"), "agent-config-sync resources must not expose provider overlay readers");
assertCondition(executionContract.includes("resolveProviderContent"), "execution contract must expose service-owned provider content resolution");
assertCondition(executionRouter.includes("resolveProviderContent"), "execution router must implement provider content resolution");
assertCondition(!baseSource.includes("planningRuntime"), "agent-config-sync base deps must not declare planningRuntime");
assertCondition(!baseSource.includes("executionRuntime"), "agent-config-sync base deps must not declare executionRuntime");
assertCondition(!baseSource.includes("retirementRuntime"), "agent-config-sync base deps must not declare retirementRuntime");
assertCondition(!baseSource.includes("undoRuntime"), "agent-config-sync base deps must not declare undoRuntime");

for (const [label, source] of Object.entries({
  executionModule,
  planningModule,
  retirementModule,
  undoModule,
})) {
  assertCondition(!source.includes('from "./repository"'), `${label} must not import repository directly`);
  assertCondition(!source.includes("createRepository("), `${label} must not construct repositories inline`);
  assertCondition(!source.includes(".use(repository)"), `${label} must not compose repository middleware`);
  assertCondition(!source.includes("context.provided.repo"), `${label} must not map a repository into handler context`);
}

for (const [label, source] of Object.entries({
  executionMiddleware,
  planningMiddleware,
  retirementMiddleware,
  undoMiddleware,
})) {
  assertCondition(!source.includes("createServiceProvider"), `${label} must not create repository providers`);
  assertCondition(!source.includes("export const repository"), `${label} must not export repository providers`);
}

for (const forbidden of ["SyncAgentSelection", "TargetHomes", "WorkspaceSkip", "SyncPolicy"]) {
  assertCondition(!sharedSchemas.includes(forbidden), `shared schemas must not contain planning-only ${forbidden}`);
}

const sharedInternalRoot = "services/agent-config-sync/src/service/shared/internal";
const allowedSharedInternal = new Set([`${sharedInternalRoot}/source-scope.ts`]);
for (const entry of await fs.readdir(sharedInternalRoot, { withFileTypes: true })) {
  const relPath = path.posix.join(sharedInternalRoot, entry.name);
  assertCondition(entry.isFile(), `${relPath} must not be a shared/internal directory`);
  assertCondition(allowedSharedInternal.has(relPath), `${relPath} is shared/internal junk; move it to its owning module`);
}

for (const relPath of [
  "packages/agent-config-sync-host",
  "services/agent-config-sync/src/service/shared/ports",
  "services/agent-config-sync/src/service/modules/execution/effective-content.ts",
  "services/agent-config-sync/src/service/modules/execution/repository.ts",
  "services/agent-config-sync/src/service/modules/execution/sync-engine.ts",
  "services/agent-config-sync/src/service/modules/planning/repository.ts",
  "services/agent-config-sync/src/service/modules/planning/workspace-planning.ts",
  "services/agent-config-sync/src/service/modules/retirement/repository.ts",
  "services/agent-config-sync/src/service/modules/retirement/retire-stale-managed.ts",
  "services/agent-config-sync/src/service/modules/undo/repository.ts",
  "services/agent-config-sync/src/service/modules/undo/sync-undo.ts",
  "services/agent-config-sync/src/service/modules/planning/schemas.ts",
  "services/agent-config-sync/src/service/modules/execution/schemas.ts",
  "services/agent-config-sync/src/service/modules/retirement/schemas.ts",
  "services/agent-config-sync/src/service/modules/undo/schemas.ts",
  "plugins/cli/plugins/src/lib/agent-config-sync-resources/plugin-content.ts",
  "plugins/cli/plugins/src/lib/agent-config-sync-resources/scan-canonical-content.ts",
  "plugins/cli/plugins/src/lib/agent-config-sync-resources/effective-content.ts",
]) {
  assertCondition(!(await pathExists(relPath)), `${relPath} must not exist`);
}

for (const [label, source] of Object.entries({ pluginPluginsPackageJson })) {
  assertCondition(!source.includes("@rawr/agent-config-sync-host"), `${label} must not reference @rawr/agent-config-sync-host`);
  assertCondition(!source.includes("agent-config-sync-host"), `${label} must not reference agent-config-sync-host`);
}

assertCondition(sharedReadme.includes("example-todo"), "shared README must anchor the example-todo service shape");
assertCondition(clientSource.includes("defineServicePackage(router)"), "agent-config-sync client must keep defineServicePackage(router)");
assertCondition(!(await pathExists("packages/agent-sync")), "legacy packages/agent-sync must not exist");

console.log("verify-agent-config-sync-service-shape: OK");
