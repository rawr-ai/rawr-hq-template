#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";
import { assertCondition, assertExactSet, pathExists, readFile, readJson, root, toPosix } from "./_verify-utils.mjs";
import { findHqOpsServiceBoundaryPurityFindings } from "../phase-03/verify-hq-ops-service-boundary-purity.mjs";

const REQUIRED_PATHS = [
  "services/hq-ops/package.json",
  "services/hq-ops/tsconfig.json",
  "services/hq-ops/tsconfig.build.json",
  "services/hq-ops/src/index.ts",
  "services/hq-ops/src/client.ts",
  "services/hq-ops/src/router.ts",
  "services/hq-ops/src/service/base.ts",
  "services/hq-ops/src/service/contract.ts",
  "services/hq-ops/src/service/impl.ts",
  "services/hq-ops/src/service/router.ts",
  "services/hq-ops/src/service/shared/README.md",
  "services/hq-ops/src/service/shared/errors.ts",
  "services/hq-ops/src/service/shared/internal-errors.ts",
  "services/hq-ops/src/service/shared/ports/resources.ts",
  "services/hq-ops/src/service/modules/config/contract.ts",
  "services/hq-ops/src/service/modules/config/entities.ts",
  "services/hq-ops/src/service/modules/config/helpers/load.ts",
  "services/hq-ops/src/service/modules/config/helpers/paths.ts",
  "services/hq-ops/src/service/modules/config/helpers/validation.ts",
  "services/hq-ops/src/service/modules/config/middleware.ts",
  "services/hq-ops/src/service/modules/config/module.ts",
  "services/hq-ops/src/service/modules/config/router.ts",
  "services/hq-ops/src/service/modules/repo-state/contract.ts",
  "services/hq-ops/src/service/modules/repo-state/entities.ts",
  "services/hq-ops/src/service/modules/repo-state/helpers/storage.ts",
  "services/hq-ops/src/service/modules/repo-state/middleware.ts",
  "services/hq-ops/src/service/modules/repo-state/module.ts",
  "services/hq-ops/src/service/modules/repo-state/router.ts",
  "services/hq-ops/src/service/modules/journal/contract.ts",
  "services/hq-ops/src/service/modules/journal/entities.ts",
  "services/hq-ops/src/service/modules/journal/helpers/paths.ts",
  "services/hq-ops/src/service/modules/journal/helpers/semantic.ts",
  "services/hq-ops/src/service/modules/journal/helpers/storage.ts",
  "services/hq-ops/src/service/modules/journal/middleware.ts",
  "services/hq-ops/src/service/modules/journal/module.ts",
  "services/hq-ops/src/service/modules/journal/router.ts",
  "services/hq-ops/src/service/modules/journal/types.ts",
  "services/hq-ops/src/service/modules/security/contract.ts",
  "services/hq-ops/src/service/modules/security/helpers/audit.ts",
  "services/hq-ops/src/service/modules/security/helpers/process.ts",
  "services/hq-ops/src/service/modules/security/helpers/reporting.ts",
  "services/hq-ops/src/service/modules/security/helpers/secrets.ts",
  "services/hq-ops/src/service/modules/security/middleware.ts",
  "services/hq-ops/src/service/modules/security/module.ts",
  "services/hq-ops/src/service/modules/security/router.ts",
  "services/hq-ops/src/service/modules/security/types.ts",
  "services/hq-ops/src/service/modules/plugin-catalog/contract.ts",
  "services/hq-ops/src/service/modules/plugin-catalog/entities.ts",
  "services/hq-ops/src/service/modules/plugin-catalog/helpers/discovery.ts",
  "services/hq-ops/src/service/modules/plugin-catalog/helpers/manifest.ts",
  "services/hq-ops/src/service/modules/plugin-catalog/helpers/path-utils.ts",
  "services/hq-ops/src/service/modules/plugin-catalog/middleware.ts",
  "services/hq-ops/src/service/modules/plugin-catalog/module.ts",
  "services/hq-ops/src/service/modules/plugin-catalog/router.ts",
  "services/hq-ops/src/service/modules/plugin-install/contract.ts",
  "services/hq-ops/src/service/modules/plugin-install/entities.ts",
  "services/hq-ops/src/service/modules/plugin-install/helpers/install-utils.ts",
  "services/hq-ops/src/service/modules/plugin-install/middleware.ts",
  "services/hq-ops/src/service/modules/plugin-install/module.ts",
  "services/hq-ops/src/service/modules/plugin-install/router.ts",
  "services/hq-ops/src/service/modules/plugin-lifecycle/contract.ts",
  "services/hq-ops/src/service/modules/plugin-lifecycle/entities.ts",
  "services/hq-ops/src/service/modules/plugin-lifecycle/helpers/merge-utils.ts",
  "services/hq-ops/src/service/modules/plugin-lifecycle/helpers/path-utils.ts",
  "services/hq-ops/src/service/modules/plugin-lifecycle/middleware.ts",
  "services/hq-ops/src/service/modules/plugin-lifecycle/module.ts",
  "services/hq-ops/src/service/modules/plugin-lifecycle/router.ts",
  "services/hq-ops/test/config.test.ts",
  "services/hq-ops/test/helpers.ts",
  "services/hq-ops/test/plugin-catalog.test.ts",
  "services/hq-ops/test/plugin-install.test.ts",
  "services/hq-ops/test/plugin-lifecycle.test.ts",
  "services/hq-ops/test/ports-backed-service.test.ts",
  "services/hq-ops/test/service-shape.test.ts",
];

const RUNTIME_HELPER_PATHS = [
  "services/hq-ops/src/bin/security-check.ts",
  "services/hq-ops/src/service/modules/repo-state/storage.ts",
  "services/hq-ops/src/service/modules/repo-state/support.ts",
  "services/hq-ops/src/service/modules/journal/sqlite.ts",
  "services/hq-ops/src/service/modules/journal/support.ts",
  "services/hq-ops/src/service/modules/journal/writer.ts",
  "services/hq-ops/src/service/modules/security/exec.ts",
  "services/hq-ops/src/service/modules/security/report.ts",
  "services/hq-ops/src/service/modules/security/secrets.ts",
  "services/hq-ops/src/service/modules/security/support.ts",
];

const ALLOWED_SHARED_PATHS = [
  "services/hq-ops/src/service/shared/README.md",
  "services/hq-ops/src/service/shared/errors.ts",
  "services/hq-ops/src/service/shared/internal-errors.ts",
  "services/hq-ops/src/service/shared/ports/resources.ts",
];

const REQUIRED_RESOURCE_PORT_CONSUMERS = [
  "services/hq-ops/src/service/base.ts",
  "services/hq-ops/src/service/modules/config/helpers/paths.ts",
  "services/hq-ops/src/service/modules/journal/helpers/paths.ts",
  "services/hq-ops/src/service/modules/journal/helpers/storage.ts",
  "services/hq-ops/src/service/modules/repo-state/helpers/storage.ts",
  "services/hq-ops/src/service/modules/security/router.ts",
  "services/hq-ops/src/service/modules/security/helpers/audit.ts",
  "services/hq-ops/src/service/modules/security/helpers/process.ts",
  "services/hq-ops/src/service/modules/security/helpers/reporting.ts",
  "services/hq-ops/src/service/modules/security/helpers/secrets.ts",
];

async function listFilesUnder(relRoot) {
  const absRoot = path.join(root, relRoot);
  const found = [];

  async function walk(absPath) {
    const entries = await fs.readdir(absPath, { withFileTypes: true });
    for (const entry of entries) {
      const childAbsPath = path.join(absPath, entry.name);
      if (entry.isDirectory()) {
        await walk(childAbsPath);
        continue;
      }
      if (!entry.isFile()) continue;
      found.push(toPosix(path.relative(root, childAbsPath)));
    }
  }

  await walk(absRoot);
  return found.sort();
}

for (const relPath of REQUIRED_PATHS) {
  assertCondition(await pathExists(relPath), `missing required HQ Ops path: ${relPath}`);
}

for (const relPath of RUNTIME_HELPER_PATHS) {
  assertCondition(!(await pathExists(relPath)), `runtime-heavy HQ Ops service helper must not survive in service layer: ${relPath}`);
}

assertExactSet(
  await listFilesUnder("services/hq-ops/src/service/shared"),
  ALLOWED_SHARED_PATHS,
  "hq-ops service/shared file allowlist",
);

const pkg = await readJson("services/hq-ops/package.json");
assertCondition(pkg.name === "@rawr/hq-ops", `expected package name @rawr/hq-ops, got ${pkg.name}`);

const exportsMap = pkg.exports ?? {};
for (const key of [".", "./service/contract", "./router"]) {
  assertCondition(exportsMap[key], `hq-ops package exports must include ${key}`);
}

assertCondition(
  exportsMap["./service/contract"]?.default === "./src/service/contract.ts",
  "hq-ops service contract export drifted",
);
assertCondition(exportsMap["./router"]?.default === "./src/router.ts", "hq-ops router export drifted");
assertCondition(
  (pkg.nx?.tags ?? []).includes("type:service") &&
    (pkg.nx?.tags ?? []).includes("role:servicepackage") &&
    (pkg.nx?.tags ?? []).includes("migration-slice:structural-tranche"),
  "hq-ops nx tags drifted",
);
assertCondition(pkg.scripts?.build === "tsc -p tsconfig.build.json", "hq-ops build script drifted");
assertCondition(pkg.scripts?.["security:check"] === undefined, "hq-ops must not keep a service-owned security:check script");
assertCondition(pkg.scripts?.sync === "bun run --cwd ../.. sync:check --project @rawr/hq-ops", "hq-ops sync script drifted");
assertCondition(pkg.scripts?.structural === "bun ../../scripts/phase-03/run-structural-suite.mjs --project @rawr/hq-ops", "hq-ops structural script drifted");
assertCondition(pkg.scripts?.typecheck === "tsc -p tsconfig.json --noEmit", "hq-ops typecheck script drifted");
assertCondition(pkg.scripts?.test === "vitest run --project hq-ops", "hq-ops test script drifted");

const inventory = await readJson("tools/architecture-inventory/node-4-extracted-seams.json");
const project = inventory.projects?.["@rawr/hq-ops"];
assertCondition(Boolean(project), "architecture inventory is missing @rawr/hq-ops");
assertCondition(project.config === "services/hq-ops/package.json", "hq-ops inventory config path drifted");

const vitestConfig = await readFile("vitest.config.ts");
assertCondition(vitestConfig.includes('root: r("services/hq-ops")'), "vitest.config.ts is missing the hq-ops project root");
assertCondition(vitestConfig.includes('name: "hq-ops"'), "vitest.config.ts is missing the hq-ops project name");

const [contractSource, routerSource, clientSource, serviceShapeSource, baseSource, sharedResourcesSource, sharedReadmeSource] = await Promise.all([
  readFile("services/hq-ops/src/service/contract.ts"),
  readFile("services/hq-ops/src/service/router.ts"),
  readFile("services/hq-ops/src/client.ts"),
  readFile("services/hq-ops/test/service-shape.test.ts"),
  readFile("services/hq-ops/src/service/base.ts"),
  readFile("services/hq-ops/src/service/shared/ports/resources.ts"),
  readFile("services/hq-ops/src/service/shared/README.md"),
]);

for (const key of ["config", "repoState", "journal", "security", "pluginCatalog", "pluginInstall", "pluginLifecycle"]) {
  assertCondition(contractSource.includes(`  ${key},`) || contractSource.includes(`\n  ${key},`), `root contract is missing ${key}`);
  assertCondition(routerSource.includes(`  ${key},`) || routerSource.includes(`\n  ${key},`), `root router is missing ${key}`);
}

assertCondition(baseSource.includes("resources: HqOpsResources"), "hq-ops base service deps must declare primitive resources");
for (const forbiddenDep of ["configStore", "repoStateStore", "journalStore", "securityRuntime"]) {
  assertCondition(!baseSource.includes(forbiddenDep), `hq-ops base service deps must not declare ${forbiddenDep}`);
}

for (const expectedResourceType of [
  "FileSystemResource",
  "PathResource",
  "ProcessResource",
  "SqliteResource",
  "EmbeddingResource",
  "HqOpsResources",
]) {
  assertCondition(
    sharedResourcesSource.includes(`export type ${expectedResourceType}`),
    `hq-ops resources port must export ${expectedResourceType}`,
  );
}

for (const forbiddenResourceFragment of [
  "ConfigStore",
  "RepoStateStore",
  "JournalStore",
  "SecurityRuntime",
  "loadRawrConfig",
  "mutateRepoState",
  "writeSnippet",
  "securityCheck",
]) {
  assertCondition(
    !sharedResourcesSource.includes(forbiddenResourceFragment),
    `hq-ops resources port must stay primitive and not expose ${forbiddenResourceFragment}`,
  );
}

for (const relPath of REQUIRED_RESOURCE_PORT_CONSUMERS) {
  const source = await readFile(relPath);
  assertCondition(
    source.includes("shared/ports/resources"),
    `${relPath} must consume the shared primitive HQ Ops resources port`,
  );
}

assertCondition(
  sharedReadmeSource.includes("Keep module-owned config, repo-state, journal, and security behavior inside the owning module directory."),
  "hq-ops shared README must document module-local behavior ownership",
);

assertCondition(clientSource.includes("defineServicePackage(router)"), "hq-ops client must keep defineServicePackage(router)");
assertCondition(clientSource.includes("servicePackage.createClient(boundary)"), "hq-ops client must create clients through the package boundary");

const moduleExpectations = [
  {
    contractPath: "services/hq-ops/src/service/modules/config/contract.ts",
    expected: ["getWorkspaceConfig", "getGlobalConfig", "getLayeredConfig", "listGlobalSyncSources", "addGlobalSyncSource", "removeGlobalSyncSource"],
  },
  {
    contractPath: "services/hq-ops/src/service/modules/repo-state/contract.ts",
    expected: ["getState", "enablePlugin", "disablePlugin"],
  },
  {
    contractPath: "services/hq-ops/src/service/modules/journal/contract.ts",
    expected: ["writeEvent", "writeSnippet", "getSnippet", "tailSnippets", "searchSnippets"],
  },
  {
    contractPath: "services/hq-ops/src/service/modules/security/contract.ts",
    expected: ["securityCheck", "gateEnable", "getSecurityReport"],
  },
  {
    contractPath: "services/hq-ops/src/service/modules/plugin-catalog/contract.ts",
    expected: ["listWorkspacePlugins", "resolveWorkspacePlugin"],
  },
  {
    contractPath: "services/hq-ops/src/service/modules/plugin-install/contract.ts",
    expected: ["assessInstallState", "planInstallRepair"],
  },
  {
    contractPath: "services/hq-ops/src/service/modules/plugin-lifecycle/contract.ts",
    expected: [
      "resolveLifecycleTarget",
      "evaluateLifecycleCompleteness",
      "checkScratchPolicy",
      "planSweepCandidates",
      "decideMergePolicy",
    ],
  },
];

for (const { contractPath, expected } of moduleExpectations) {
  const source = await readFile(contractPath);
  for (const key of expected) {
    assertCondition(source.includes(`${key}:`), `${contractPath} must define ${key}`);
    assertCondition(serviceShapeSource.includes(`"${key}"`), `service-shape.test.ts must ratchet ${key}`);
  }
}

const bannedFragments = [
  "packages/control-plane",
  "packages/journal",
  "packages/security",
  "services/state",
  "@rawr/control-plane",
  "@rawr/journal",
  "@rawr/security",
  "@rawr/state",
];

for (const relPath of REQUIRED_PATHS.filter((path) => path.startsWith("services/hq-ops/src/"))) {
  if (!(await pathExists(relPath))) continue;
  const source = await readFile(relPath);
  for (const fragment of bannedFragments) {
    assertCondition(!source.includes(fragment), `${relPath} illegally references ${fragment}`);
  }
}

for (const relPath of [
  "services/hq-ops/src/service/modules/config/model.ts",
  "services/hq-ops/src/service/modules/config/repository.ts",
  "services/hq-ops/src/service/modules/config/support.ts",
  "services/hq-ops/src/service/modules/config/helpers/global-sources.ts",
  "services/hq-ops/src/service/modules/config/helpers/layers.ts",
  "services/hq-ops/src/service/modules/repo-state/model.ts",
  "services/hq-ops/src/service/modules/repo-state/repository.ts",
  "services/hq-ops/src/service/modules/repo-state/schemas.ts",
  "services/hq-ops/src/service/modules/journal/repository.ts",
  "services/hq-ops/src/service/modules/journal/schemas.ts",
  "services/hq-ops/src/service/modules/security/repository.ts",
  "services/hq-ops/src/service/modules/security/schemas.ts",
  "services/hq-ops/src/service/modules/plugin-install/model.ts",
  "services/hq-ops/src/service/modules/plugin-install/repository.ts",
  "services/hq-ops/src/service/modules/plugin-install/schemas.ts",
  "services/hq-ops/src/service/modules/plugin-lifecycle/model.ts",
  "services/hq-ops/src/service/modules/plugin-lifecycle/repository.ts",
  "services/hq-ops/src/service/modules/plugin-lifecycle/schemas.ts",
  "services/hq-ops/src/service/shared/ports/config-store.ts",
  "services/hq-ops/src/service/shared/ports/repo-state-store.ts",
  "services/hq-ops/src/service/shared/ports/journal-store.ts",
  "services/hq-ops/src/service/shared/ports/security-runtime.ts",
]) {
  assertCondition(!(await pathExists(relPath)), `obsolete high-level HQ Ops behavior port must not survive: ${relPath}`);
}

const purityFindings = await findHqOpsServiceBoundaryPurityFindings();
assertCondition(
  purityFindings.length === 0,
  `hq-ops service boundary purity failed:\n${purityFindings.map((finding) => `- ${finding}`).join("\n")}`,
);

console.log("verify-hq-ops-service-shape: OK");
