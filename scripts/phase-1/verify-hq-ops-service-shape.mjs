#!/usr/bin/env bun
import {
  assertCondition,
  assertExactSet,
  pathExists,
  readFile,
  readJson,
} from "./_verify-utils.mjs";

const REQUIRED_PATHS = [
  "services/hq-ops/package.json",
  "services/hq-ops/tsconfig.json",
  "services/hq-ops/src/index.ts",
  "services/hq-ops/src/client.ts",
  "services/hq-ops/src/router.ts",
  "services/hq-ops/src/config/index.ts",
  "services/hq-ops/src/journal/index.ts",
  "services/hq-ops/src/repo-state/index.ts",
  "services/hq-ops/src/repo-state/model.ts",
  "services/hq-ops/src/repo-state/storage.ts",
  "services/hq-ops/src/security/index.ts",
  "services/hq-ops/src/service/base.ts",
  "services/hq-ops/src/service/contract.ts",
  "services/hq-ops/src/service/impl.ts",
  "services/hq-ops/src/service/router.ts",
  "services/hq-ops/src/service/middleware/analytics.ts",
  "services/hq-ops/src/service/middleware/observability.ts",
  "services/hq-ops/src/service/shared/README.md",
  "services/hq-ops/src/service/shared/errors.ts",
  "services/hq-ops/src/service/shared/internal-errors.ts",
  "services/hq-ops/src/service/modules/config/contract.ts",
  "services/hq-ops/src/service/modules/config/middleware.ts",
  "services/hq-ops/src/service/modules/config/module.ts",
  "services/hq-ops/src/service/modules/config/repository.ts",
  "services/hq-ops/src/service/modules/config/router.ts",
  "services/hq-ops/src/service/modules/config/schemas.ts",
  "services/hq-ops/src/service/modules/repo-state/contract.ts",
  "services/hq-ops/src/service/modules/repo-state/middleware.ts",
  "services/hq-ops/src/service/modules/repo-state/module.ts",
  "services/hq-ops/src/service/modules/repo-state/repository.ts",
  "services/hq-ops/src/service/modules/repo-state/router.ts",
  "services/hq-ops/src/service/modules/repo-state/schemas.ts",
  "services/hq-ops/src/service/modules/journal/contract.ts",
  "services/hq-ops/src/service/modules/journal/middleware.ts",
  "services/hq-ops/src/service/modules/journal/module.ts",
  "services/hq-ops/src/service/modules/journal/repository.ts",
  "services/hq-ops/src/service/modules/journal/router.ts",
  "services/hq-ops/src/service/modules/journal/schemas.ts",
  "services/hq-ops/src/service/modules/security/contract.ts",
  "services/hq-ops/src/service/modules/security/middleware.ts",
  "services/hq-ops/src/service/modules/security/module.ts",
  "services/hq-ops/src/service/modules/security/repository.ts",
  "services/hq-ops/src/service/modules/security/router.ts",
  "services/hq-ops/src/service/modules/security/schemas.ts",
  "services/hq-ops/test/config.test.ts",
  "services/hq-ops/test/repo-state.concurrent.test.ts",
  "services/hq-ops/test/security.test.ts",
  "services/hq-ops/test/service-shape.test.ts",
];

for (const relPath of REQUIRED_PATHS) {
  assertCondition(await pathExists(relPath), `missing required HQ Ops shell path: ${relPath}`);
}

const pkg = await readJson("services/hq-ops/package.json");
assertCondition(pkg.name === "@rawr/hq-ops", `expected package name @rawr/hq-ops, got ${pkg.name}`);
assertExactSet(
  Object.keys(pkg.exports ?? {}),
  [".", "./config", "./journal", "./repo-state", "./router", "./security", "./service/contract"],
  "hq-ops package exports",
);
assertExactSet(pkg.nx?.tags ?? [], ["migration-slice:structural-tranche", "role:servicepackage", "type:service"], "hq-ops nx tags");
assertCondition(pkg.scripts?.build === "bunx tsc -p tsconfig.json", "hq-ops build script drifted");
assertCondition(pkg.scripts?.sync === "bun run --cwd ../.. sync:check --project @rawr/hq-ops", "hq-ops sync script drifted");
assertCondition(pkg.scripts?.structural === "bun ../../scripts/phase-03/run-structural-suite.mjs --project @rawr/hq-ops", "hq-ops structural script drifted");
assertCondition(pkg.scripts?.typecheck === "bunx tsc -p tsconfig.json --noEmit", "hq-ops typecheck script drifted");
assertCondition(pkg.scripts?.test === "vitest run --project hq-ops", "hq-ops test script drifted");

const inventory = await readJson("tools/architecture-inventory/node-4-extracted-seams.json");
const project = inventory.projects?.["@rawr/hq-ops"];
assertCondition(Boolean(project), "architecture inventory is missing @rawr/hq-ops");
assertCondition(project.config === "services/hq-ops/package.json", "hq-ops inventory config path drifted");
assertExactSet(project.tags ?? [], ["migration-slice:structural-tranche", "role:servicepackage", "type:service"], "hq-ops inventory tags");
assertExactSet(project.targets ?? [], ["build", "sync", "structural", "typecheck", "test"], "hq-ops inventory targets");

const vitestConfig = await readFile("vitest.config.ts");
assertCondition(vitestConfig.includes('root: r("services/hq-ops")'), "vitest.config.ts is missing the hq-ops project root");
assertCondition(vitestConfig.includes('name: "hq-ops"'), "vitest.config.ts is missing the hq-ops project name");

const contractSource = await readFile("services/hq-ops/src/service/contract.ts");
for (const key of ["config", "repoState", "journal", "security"]) {
  assertCondition(contractSource.includes(`  ${key},`), `root contract is missing the ${key} module`);
}

const routerSource = await readFile("services/hq-ops/src/service/router.ts");
for (const key of ["config", "repoState", "journal", "security"]) {
  assertCondition(routerSource.includes(`  ${key},`), `root router is missing the ${key} module`);
}

const clientSource = await readFile("services/hq-ops/src/client.ts");
assertCondition(clientSource.includes("defineServicePackage(router);"), "hq-ops client must keep the canonical direct defineServicePackage(router) boundary");
assertCondition(!clientSource.includes("as never"), "hq-ops client must not rely on a router-as-never cast");

for (const moduleName of ["config", "journal", "security"]) {
  const contractPath = `services/hq-ops/src/service/modules/${moduleName}/contract.ts`;
  const modulePath = `services/hq-ops/src/service/modules/${moduleName}/module.ts`;
  const routerPath = `services/hq-ops/src/service/modules/${moduleName}/router.ts`;
  const contractModuleSource = await readFile(contractPath);
  const moduleSource = await readFile(modulePath);
  const moduleRouterSource = await readFile(routerPath);

  assertCondition(contractModuleSource.includes("reservation:"), `${contractPath} must reserve a reservation procedure`);
  assertCondition(moduleSource.includes(".use(observability)"), `${modulePath} must attach module observability middleware`);
  assertCondition(moduleSource.includes(".use(analytics)"), `${modulePath} must attach module analytics middleware`);
  assertCondition(moduleSource.includes(".use(repository)"), `${modulePath} must attach the module repository provider`);
  assertCondition(moduleSource.includes("context.provided.repo"), `${modulePath} must shape context from context.provided.repo`);
  assertCondition(moduleRouterSource.includes("module.reservation.handler"), `${routerPath} must implement the reservation handler through the module seam`);
}

const repoStateContractSource = await readFile("services/hq-ops/src/service/modules/repo-state/contract.ts");
const repoStateRepositorySource = await readFile("services/hq-ops/src/service/modules/repo-state/repository.ts");
const repoStateModuleSource = await readFile("services/hq-ops/src/service/modules/repo-state/module.ts");
const repoStateRouterSource = await readFile("services/hq-ops/src/service/modules/repo-state/router.ts");
const repoStateIndexSource = await readFile("services/hq-ops/src/repo-state/index.ts");
const repoStateStorageSource = await readFile("services/hq-ops/src/repo-state/storage.ts");

assertCondition(repoStateContractSource.includes("getState:"), "repo-state contract must expose getState");
assertCondition(repoStateRepositorySource.includes("getRepoStateWithAuthority"), "repo-state repository must wrap getRepoStateWithAuthority");
assertCondition(repoStateModuleSource.includes(".use(repository)"), "repo-state module must attach repository provider");
assertCondition(repoStateRouterSource.includes("module.getState.handler"), "repo-state router must implement getState");
for (const name of ["getRepoState", "getRepoStateWithAuthority", "enablePlugin", "disablePlugin", "mutateRepoStateAtomically"]) {
  assertCondition(repoStateIndexSource.includes(name), `repo-state index must export ${name}`);
  assertCondition(repoStateStorageSource.includes(`function ${name}`), `repo-state storage must define ${name}`);
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
  const source = await readFile(relPath);
  for (const fragment of bannedFragments) {
    assertCondition(!source.includes(fragment), `${relPath} illegally references ${fragment}`);
  }
}

console.log("verify-hq-ops-service-shape: OK");
