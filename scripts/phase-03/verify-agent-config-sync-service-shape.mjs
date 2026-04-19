#!/usr/bin/env bun
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
  "services/agent-config-sync/src/service/shared/schemas.ts",
  "services/agent-config-sync/src/service/shared/ports/planning-runtime.ts",
  "services/agent-config-sync/src/service/shared/ports/execution-runtime.ts",
  "services/agent-config-sync/src/service/shared/ports/retirement-runtime.ts",
  "services/agent-config-sync/src/service/shared/ports/undo-runtime.ts",
  "services/agent-config-sync/src/service/modules/planning/contract.ts",
  "services/agent-config-sync/src/service/modules/planning/middleware.ts",
  "services/agent-config-sync/src/service/modules/planning/module.ts",
  "services/agent-config-sync/src/service/modules/planning/repository.ts",
  "services/agent-config-sync/src/service/modules/planning/router.ts",
  "services/agent-config-sync/src/service/modules/planning/schemas.ts",
  "services/agent-config-sync/src/service/modules/execution/contract.ts",
  "services/agent-config-sync/src/service/modules/execution/middleware.ts",
  "services/agent-config-sync/src/service/modules/execution/module.ts",
  "services/agent-config-sync/src/service/modules/execution/repository.ts",
  "services/agent-config-sync/src/service/modules/execution/router.ts",
  "services/agent-config-sync/src/service/modules/execution/schemas.ts",
  "services/agent-config-sync/src/service/modules/retirement/contract.ts",
  "services/agent-config-sync/src/service/modules/retirement/middleware.ts",
  "services/agent-config-sync/src/service/modules/retirement/module.ts",
  "services/agent-config-sync/src/service/modules/retirement/repository.ts",
  "services/agent-config-sync/src/service/modules/retirement/router.ts",
  "services/agent-config-sync/src/service/modules/retirement/schemas.ts",
  "services/agent-config-sync/src/service/modules/undo/contract.ts",
  "services/agent-config-sync/src/service/modules/undo/middleware.ts",
  "services/agent-config-sync/src/service/modules/undo/module.ts",
  "services/agent-config-sync/src/service/modules/undo/repository.ts",
  "services/agent-config-sync/src/service/modules/undo/router.ts",
  "services/agent-config-sync/src/service/modules/undo/schemas.ts",
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

const [contractSource, routerSource, clientSource, sharedReadme, serviceShapeTest] = await Promise.all([
  readFile("services/agent-config-sync/src/service/contract.ts"),
  readFile("services/agent-config-sync/src/service/router.ts"),
  readFile("services/agent-config-sync/src/client.ts"),
  readFile("services/agent-config-sync/src/service/shared/README.md"),
  readFile("services/agent-config-sync/test/service-shape.test.ts"),
]);

for (const key of ["planning", "execution", "retirement", "undo"]) {
  assertCondition(contractSource.includes(`  ${key},`) || contractSource.includes(`\n  ${key},`), `root contract is missing ${key}`);
  assertCondition(routerSource.includes(`  ${key},`) || routerSource.includes(`\n  ${key},`), `root router is missing ${key}`);
  assertCondition(serviceShapeTest.includes(`"${key}"`), `service-shape test must ratchet ${key}`);
}

for (const depKey of ["planningRuntime", "executionRuntime", "retirementRuntime", "undoRuntime"]) {
  const baseSource = await readFile("services/agent-config-sync/src/service/base.ts");
  assertCondition(baseSource.includes(depKey), `agent-config-sync base service deps must declare ${depKey}`);
}

assertCondition(sharedReadme.includes("example-todo"), "shared README must anchor the example-todo service shape");
assertCondition(clientSource.includes("defineServicePackage(router)"), "agent-config-sync client must keep defineServicePackage(router)");
assertCondition(!(await pathExists("packages/agent-sync")), "legacy packages/agent-sync must not exist");

console.log("verify-agent-config-sync-service-shape: OK");
