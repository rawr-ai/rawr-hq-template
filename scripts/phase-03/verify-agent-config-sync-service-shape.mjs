#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";
import { assertCondition, pathExists, readFile, readJson } from "../phase-1/_verify-utils.mjs";

const SERVICE_MODULES = ["planning", "execution", "retirement", "undo"];
const MODULE_ROOT_FILE = /^(contract|router|errors|entities|module|middleware)\.ts$/u;
const ROUTER_ROOT_FILE = /^(index|[a-z0-9-]+\.router)\.ts$/u;
const REPOSITORY_FILE = /^[a-z0-9-]+-repository\.ts$/u;
const MODULE_REPOSITORY_FILES = new Map([
  ["planning", new Set([
    "source-plugin-repository.ts",
    "workspace-root-repository.ts",
  ])],
  ["execution", new Set([
    "claude-destination-sync-repository.ts",
    "codex-destination-sync-repository.ts",
    "codex-native-agent-role-repository.ts",
  ])],
  ["retirement", new Set([
    "claude-retirement-repository.ts",
    "codex-cleanup-behind-repository.ts",
    "codex-retirement-repository.ts",
  ])],
  ["undo", new Set([
    "capsule-capture-repository.ts",
    "capsule-store-repository.ts",
    "path-snapshot-repository.ts",
  ])],
]);
const FORBIDDEN_MODULE_DIRS = new Set([
  "helpers",
  "operations",
  "procedures",
  "support",
  "utils",
  "common",
  "shared",
  "internal",
]);

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
  "services/agent-config-sync/src/service/common/README.md",
  "services/agent-config-sync/src/service/common/errors.ts",
  "services/agent-config-sync/src/service/common/internal-errors.ts",
  "services/agent-config-sync/src/service/common/resources.ts",
  "services/agent-config-sync/src/service/common/entities.ts",
  "services/agent-config-sync/src/service/common/entities/sync-results.ts",
  "services/agent-config-sync/src/service/common/internal/source-scope.ts",
  "services/agent-config-sync/src/service/common/source-content/entities.ts",
  "services/agent-config-sync/src/service/common/source-content/helpers/composed-tools.ts",
  "services/agent-config-sync/src/service/common/source-content/helpers/manifest.ts",
  "services/agent-config-sync/src/service/common/source-content/helpers/merge-content.ts",
  "services/agent-config-sync/src/service/common/source-content/helpers/provider-content.ts",
  "services/agent-config-sync/src/service/common/source-content/helpers/scan-content.ts",
  "services/agent-config-sync/src/service/common/source-content/helpers/source-plugin-content.ts",
  "services/agent-config-sync/src/service/common/helpers/sync-results.ts",
  "services/agent-config-sync/src/service/common/helpers/projections.ts",
  "services/agent-config-sync/src/service/common/helpers/retirement-filesystem-actions.ts",
  "services/agent-config-sync/src/service/common/repositories/destination-sync-repository.ts",
  "services/agent-config-sync/src/service/common/repositories/codex-registry-repository.ts",
  "services/agent-config-sync/src/service/common/repositories/codex-config-repository.ts",
  "services/agent-config-sync/src/service/common/repositories/codex-hooks-repository.ts",
  "services/agent-config-sync/src/service/common/repositories/codex-runtime-paths.ts",
  "services/agent-config-sync/src/service/common/repositories/claude-marketplace-repository.ts",
  "services/agent-config-sync/src/service/modules/planning/contract.ts",
  "services/agent-config-sync/src/service/modules/planning/entities.ts",
  "services/agent-config-sync/src/service/modules/planning/middleware.ts",
  "services/agent-config-sync/src/service/modules/planning/module.ts",
  "services/agent-config-sync/src/service/modules/planning/router/index.ts",
  "services/agent-config-sync/src/service/modules/planning/router/full-sync-policy.router.ts",
  "services/agent-config-sync/src/service/modules/planning/router/workspace-sync.router.ts",
  "services/agent-config-sync/src/service/modules/execution/contract.ts",
  "services/agent-config-sync/src/service/modules/execution/middleware.ts",
  "services/agent-config-sync/src/service/modules/execution/module.ts",
  "services/agent-config-sync/src/service/modules/execution/router/index.ts",
  "services/agent-config-sync/src/service/modules/execution/router/codex-native-agent-roles.router.ts",
  "services/agent-config-sync/src/service/modules/execution/router/provider-sync.router.ts",
  "services/agent-config-sync/src/service/modules/retirement/contract.ts",
  "services/agent-config-sync/src/service/modules/retirement/entities.ts",
  "services/agent-config-sync/src/service/modules/retirement/middleware.ts",
  "services/agent-config-sync/src/service/modules/retirement/module.ts",
  "services/agent-config-sync/src/service/modules/retirement/router/index.ts",
  "services/agent-config-sync/src/service/modules/retirement/router/cleanup-behind-provider-sync.router.ts",
  "services/agent-config-sync/src/service/modules/retirement/router/retire-stale-managed.router.ts",
  "services/agent-config-sync/src/service/modules/undo/contract.ts",
  "services/agent-config-sync/src/service/modules/undo/entities.ts",
  "services/agent-config-sync/src/service/modules/undo/middleware.ts",
  "services/agent-config-sync/src/service/modules/undo/module.ts",
  "services/agent-config-sync/src/service/modules/undo/router/index.ts",
  "services/agent-config-sync/src/service/modules/undo/router/run-undo.router.ts",
  "services/agent-config-sync/test/helpers.ts",
  "services/agent-config-sync/test/service-shape.test.ts",
];

for (const relPath of REQUIRED_PATHS) {
  assertCondition(await pathExists(relPath), `missing required agent-config-sync path: ${relPath}`);
}

for (const [moduleName, repositoryFiles] of MODULE_REPOSITORY_FILES) {
  for (const repositoryFile of repositoryFiles) {
    const relPath = `services/agent-config-sync/src/service/modules/${moduleName}/repositories/${repositoryFile}`;
    assertCondition(await pathExists(relPath), `missing required real repository: ${relPath}`);
  }
}

const pkg = await readJson("services/agent-config-sync/package.json");
assertCondition(pkg.name === "@rawr/agent-config-sync", `expected package name @rawr/agent-config-sync, got ${pkg.name}`);
assertCondition((pkg.nx?.tags ?? []).includes("type:service"), "agent-config-sync must be tagged as a service");
assertCondition((pkg.nx?.tags ?? []).includes("role:servicepackage"), "agent-config-sync must be tagged as a servicepackage");

const exportsMap = pkg.exports ?? {};
for (const key of [".", "./client", "./service/contract", "./router"]) {
  assertCondition(exportsMap[key], `agent-config-sync package exports must include ${key}`);
}
assertCondition(exportsMap["./entities"], "agent-config-sync package exports must include ./entities");
assertCondition(!exportsMap["./schemas"], "agent-config-sync package exports must not expose ./schemas");

const [
  contractSource,
  routerSource,
  clientSource,
  commonReadme,
  serviceShapeTest,
  baseSource,
  commonResources,
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
  commonSchemas,
  pluginPluginsPackageJson,
] = await Promise.all([
  readFile("services/agent-config-sync/src/service/contract.ts"),
  readFile("services/agent-config-sync/src/service/router.ts"),
  readFile("services/agent-config-sync/src/client.ts"),
  readFile("services/agent-config-sync/src/service/common/README.md"),
  readFile("services/agent-config-sync/test/service-shape.test.ts"),
  readFile("services/agent-config-sync/src/service/base.ts"),
  readFile("services/agent-config-sync/src/service/common/resources.ts"),
  readFile("services/agent-config-sync/src/service/modules/execution/contract.ts"),
  readFile("services/agent-config-sync/src/service/modules/execution/router/index.ts"),
  readFile("services/agent-config-sync/src/service/modules/execution/middleware.ts"),
  readFile("services/agent-config-sync/src/service/modules/execution/module.ts"),
  readFile("services/agent-config-sync/src/service/modules/planning/middleware.ts"),
  readFile("services/agent-config-sync/src/service/modules/planning/module.ts"),
  readFile("services/agent-config-sync/src/service/modules/retirement/middleware.ts"),
  readFile("services/agent-config-sync/src/service/modules/retirement/module.ts"),
  readFile("services/agent-config-sync/src/service/modules/undo/middleware.ts"),
  readFile("services/agent-config-sync/src/service/modules/undo/module.ts"),
  readFile("services/agent-config-sync/src/service/common/entities.ts"),
  readFile("plugins/cli/plugins/package.json"),
]);

for (const key of ["planning", "execution", "retirement", "undo"]) {
  assertCondition(contractSource.includes(`  ${key},`) || contractSource.includes(`\n  ${key},`), `root contract is missing ${key}`);
  assertCondition(routerSource.includes(`  ${key},`) || routerSource.includes(`\n  ${key},`), `root router is missing ${key}`);
  assertCondition(serviceShapeTest.includes(`"${key}"`), `service-shape test must ratchet ${key}`);
}

assertCondition(baseSource.includes("resources: AgentConfigSyncResources"), "agent-config-sync base deps must declare concrete resource deps");
assertCondition(!commonResources.includes("sources:"), "agent-config-sync resources must not expose semantic sources ports");
assertCondition(!commonResources.includes("readProviderOverlay"), "agent-config-sync resources must not expose provider overlay readers");
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
  assertCondition(!commonSchemas.includes(forbidden), `common schemas must not contain planning-only ${forbidden}`);
}

const modulesRoot = "services/agent-config-sync/src/service/modules";
const discoveredModuleNames = new Set();
for (const moduleDir of await fs.readdir(modulesRoot, { withFileTypes: true })) {
  if (!moduleDir.isDirectory()) continue;
  discoveredModuleNames.add(moduleDir.name);
  const moduleRoot = path.posix.join(modulesRoot, moduleDir.name);
  for (const entry of await fs.readdir(moduleRoot, { withFileTypes: true })) {
    const relPath = path.posix.join(moduleRoot, entry.name);
    if (entry.isFile() && entry.name.endsWith(".ts")) {
      assertCondition(
        MODULE_ROOT_FILE.test(entry.name),
        `${relPath} must not exist as a module-root behavior file; keep callable flow and policy in router/index.ts + router/*.router.ts or external-state mechanics in explicitly allowed repositories/*-repository.ts`,
      );
      continue;
    }

    if (entry.isDirectory()) {
      assertCondition(!FORBIDDEN_MODULE_DIRS.has(entry.name), `${relPath} must not exist; use router/*.router.ts for callable flow or repositories/*-repository.ts for real repositories`);
      assertCondition(
        entry.name === "router" || entry.name === "repositories",
        `${relPath} must not exist as an unrecognized module directory`,
      );
    }
  }

  const hasRouterFile = await pathExists(`${moduleRoot}/router.ts`);
  const hasRouterDir = await pathExists(`${moduleRoot}/router/index.ts`);
  assertCondition(
    hasRouterFile !== hasRouterDir,
    `${moduleRoot} must have exactly one router entrypoint: router.ts or router/index.ts`,
  );

  if (hasRouterDir) {
    let fragmentCount = 0;
    for (const entry of await fs.readdir(`${moduleRoot}/router`, { withFileTypes: true })) {
      const relPath = path.posix.join(`${moduleRoot}/router`, entry.name);
      assertCondition(entry.isFile(), `${relPath} must not be a router subdirectory`);
      assertCondition(ROUTER_ROOT_FILE.test(entry.name), `${relPath} must be index.ts or a cohesive *.router.ts fragment`);
      if (entry.name.endsWith(".router.ts")) fragmentCount += 1;
    }
    assertCondition(fragmentCount > 0, `${moduleRoot}/router must contain at least one cohesive *.router.ts fragment`);
  }

  if (await pathExists(`${moduleRoot}/repositories`)) {
    const allowedRepositories = MODULE_REPOSITORY_FILES.get(moduleDir.name) ?? new Set();
    for (const entry of await fs.readdir(`${moduleRoot}/repositories`, { withFileTypes: true })) {
      const relPath = path.posix.join(`${moduleRoot}/repositories`, entry.name);
      assertCondition(entry.isFile(), `${relPath} must not be a repository subdirectory`);
      assertCondition(REPOSITORY_FILE.test(entry.name), `${relPath} must use the explicit *-repository.ts form`);
      assertCondition(
        allowedRepositories.has(entry.name),
        `${relPath} must not exist as a fake repository; repositories are only for source/destination/persistence state boundaries`,
      );
    }
    for (const requiredRepository of allowedRepositories) {
      assertCondition(
        await pathExists(`${moduleRoot}/repositories/${requiredRepository}`),
        `${moduleRoot}/repositories/${requiredRepository} must exist as an allowed real repository`,
      );
    }
  }
}
for (const moduleName of SERVICE_MODULES) {
  assertCondition(discoveredModuleNames.has(moduleName), `agent-config-sync modules must include ${moduleName}`);
}

const commonInternalRoot = "services/agent-config-sync/src/service/common/internal";
const allowedCommonInternal = new Set([`${commonInternalRoot}/source-scope.ts`]);
for (const entry of await fs.readdir(commonInternalRoot, { withFileTypes: true })) {
  const relPath = path.posix.join(commonInternalRoot, entry.name);
  assertCondition(entry.isFile(), `${relPath} must not be a common/internal directory`);
  assertCondition(allowedCommonInternal.has(relPath), `${relPath} is common/internal junk; move it to its owning module`);
}

for (const relPath of [
  "packages/agent-config-sync-host",
  "services/agent-config-sync/src/service/common/ports",
  "services/agent-config-sync/src/service/modules/execution/effective-content.ts",
  "services/agent-config-sync/src/service/modules/execution/repository.ts",
  "services/agent-config-sync/src/service/modules/execution/sync-engine.ts",
  "services/agent-config-sync/src/service/modules/planning/repository.ts",
  "services/agent-config-sync/src/service/modules/planning/workspace-planning.ts",
  "services/agent-config-sync/src/service/modules/retirement/repository.ts",
  "services/agent-config-sync/src/service/modules/retirement/retire-stale-managed.ts",
  "services/agent-config-sync/src/service/modules/execution/helpers/claude-target.ts",
  "services/agent-config-sync/src/service/modules/execution/helpers/codex-target.ts",
  "services/agent-config-sync/src/service/modules/retirement/helpers/claude-stale-managed.ts",
  "services/agent-config-sync/src/service/modules/retirement/helpers/codex-stale-managed.ts",
  "services/agent-config-sync/src/service/modules/planning/helpers",
  "services/agent-config-sync/src/service/modules/planning/repositories/full-sync-policy-repository.ts",
  "services/agent-config-sync/src/service/modules/planning/repositories/sync-assessment-repository.ts",
  "services/agent-config-sync/src/service/modules/planning/repositories/sync-preview-repository.ts",
  "services/agent-config-sync/src/service/modules/planning/repositories/target-home-selection-repository.ts",
  "services/agent-config-sync/src/service/modules/planning/repositories/workspace-source-repository.ts",
  "services/agent-config-sync/src/service/modules/execution/helpers",
  "services/agent-config-sync/src/service/modules/retirement/helpers",
  "services/agent-config-sync/src/service/modules/retirement/repositories/filesystem-actions-repository.ts",
  "services/agent-config-sync/src/service/modules/retirement/repositories/managed-source-repository.ts",
  "services/agent-config-sync/src/service/modules/undo/helpers",
  "services/agent-config-sync/src/service/modules/undo/repositories/capsule-paths-repository.ts",
  "services/agent-config-sync/src/service/modules/undo/repositories/command-expiration-repository.ts",
  "services/agent-config-sync/src/service/modules/undo/repositories/undo-apply-repository.ts",
  "services/agent-config-sync/src/service/modules/undo/repository.ts",
  "services/agent-config-sync/src/service/modules/undo/sync-undo.ts",
  "services/agent-config-sync/src/service/modules/source-content",
  "services/agent-config-sync/src/service/common/schemas.ts",
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

assertCondition(commonReadme.includes("example-todo"), "common README must anchor the example-todo service shape");
assertCondition(clientSource.includes("defineServicePackage(router)"), "agent-config-sync client must keep defineServicePackage(router)");
assertCondition(!(await pathExists("packages/agent-sync")), "legacy packages/agent-sync must not exist");

console.log("verify-agent-config-sync-service-shape: OK");
