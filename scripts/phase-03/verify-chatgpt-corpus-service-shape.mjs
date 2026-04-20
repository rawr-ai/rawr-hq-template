#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";
import { assertCondition, pathExists, readFile, readJson } from "../phase-1/_verify-utils.mjs";

const SERVICE_ROOT = "services/chatgpt-corpus";
const REQUIRED_PATHS = [
  `${SERVICE_ROOT}/package.json`,
  `${SERVICE_ROOT}/tsconfig.json`,
  `${SERVICE_ROOT}/tsconfig.build.json`,
  `${SERVICE_ROOT}/src/index.ts`,
  `${SERVICE_ROOT}/src/client.ts`,
  `${SERVICE_ROOT}/src/router.ts`,
  `${SERVICE_ROOT}/src/service/base.ts`,
  `${SERVICE_ROOT}/src/service/contract.ts`,
  `${SERVICE_ROOT}/src/service/impl.ts`,
  `${SERVICE_ROOT}/src/service/router.ts`,
  `${SERVICE_ROOT}/src/service/shared/errors.ts`,
  `${SERVICE_ROOT}/src/service/modules/source-materials/contract.ts`,
  `${SERVICE_ROOT}/src/service/modules/source-materials/entities.ts`,
  `${SERVICE_ROOT}/src/service/modules/source-materials/helpers/normalize.ts`,
  `${SERVICE_ROOT}/src/service/modules/source-materials/middleware.ts`,
  `${SERVICE_ROOT}/src/service/modules/source-materials/module.ts`,
  `${SERVICE_ROOT}/src/service/modules/source-materials/router.ts`,
  `${SERVICE_ROOT}/src/service/modules/workspace/contract.ts`,
  `${SERVICE_ROOT}/src/service/modules/workspace/entities.ts`,
  `${SERVICE_ROOT}/src/service/modules/workspace/helpers/template.ts`,
  `${SERVICE_ROOT}/src/service/modules/workspace/middleware.ts`,
  `${SERVICE_ROOT}/src/service/modules/workspace/module.ts`,
  `${SERVICE_ROOT}/src/service/modules/workspace/router.ts`,
  `${SERVICE_ROOT}/src/service/modules/corpus-artifacts/contract.ts`,
  `${SERVICE_ROOT}/src/service/modules/corpus-artifacts/entities.ts`,
  `${SERVICE_ROOT}/src/service/modules/corpus-artifacts/middleware.ts`,
  `${SERVICE_ROOT}/src/service/modules/corpus-artifacts/module.ts`,
  `${SERVICE_ROOT}/src/service/modules/corpus-artifacts/router.ts`,
];

for (const relPath of REQUIRED_PATHS) {
  assertCondition(await pathExists(relPath), `missing required chatgpt-corpus path: ${relPath}`);
}

const pkg = await readJson(`${SERVICE_ROOT}/package.json`);
assertCondition(pkg.name === "@rawr/chatgpt-corpus", `expected package name @rawr/chatgpt-corpus, got ${pkg.name}`);
assertCondition((pkg.nx?.tags ?? []).includes("type:service"), "chatgpt-corpus must be tagged as a service");
assertCondition((pkg.nx?.tags ?? []).includes("role:servicepackage"), "chatgpt-corpus must be tagged as a servicepackage");
assertCondition(pkg.scripts?.structural === "bun ../../scripts/phase-03/run-structural-suite.mjs --project @rawr/chatgpt-corpus", "chatgpt-corpus structural script drifted");

const exportsMap = pkg.exports ?? {};
for (const key of [".", "./client", "./service/contract", "./router"]) {
  assertCondition(exportsMap[key], `chatgpt-corpus package exports must include ${key}`);
}

const [contractSource, routerSource, artifactsContract, artifactsRouter] = await Promise.all([
  readFile(`${SERVICE_ROOT}/src/service/contract.ts`),
  readFile(`${SERVICE_ROOT}/src/service/router.ts`),
  readFile(`${SERVICE_ROOT}/src/service/modules/corpus-artifacts/contract.ts`),
  readFile(`${SERVICE_ROOT}/src/service/modules/corpus-artifacts/router.ts`),
]);

for (const key of ["workspace", "sourceMaterials", "corpusArtifacts"]) {
  assertCondition(contractSource.includes(`  ${key},`) || contractSource.includes(`\n  ${key},`), `root contract is missing ${key}`);
  assertCondition(routerSource.includes(`  ${key},`) || routerSource.includes(`\n  ${key},`), `root router is missing ${key}`);
}

assertCondition(artifactsContract.includes("CORPUS_ARTIFACT_VALIDATION_FAILED"), "corpus-artifacts error must be defined at the contract boundary");
assertCondition(!artifactsRouter.includes("rethrow"), "corpus-artifacts router must not wrap and rethrow errors");
assertCondition(!artifactsRouter.includes("buildArtifactsFromSnapshot"), "corpus-artifacts router must keep build flow in procedures");

const modulesRoot = `${SERVICE_ROOT}/src/service/modules`;
for (const moduleDir of await fs.readdir(modulesRoot, { withFileTypes: true })) {
  if (!moduleDir.isDirectory()) continue;
  const moduleRoot = path.posix.join(modulesRoot, moduleDir.name);
  for (const entry of await fs.readdir(moduleRoot, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
    assertCondition(
      /^(contract|router|entities|module|middleware)\.ts$/u.test(entry.name),
      `${path.posix.join(moduleRoot, entry.name)} must not exist as a module-root bucket`,
    );
  }
}

for (const relPath of [
  `${SERVICE_ROOT}/src/service/modules/corpus-artifacts/errors.ts`,
  `${SERVICE_ROOT}/src/service/modules/corpus-artifacts/repository.ts`,
  `${SERVICE_ROOT}/src/service/modules/corpus-artifacts/schemas.ts`,
  `${SERVICE_ROOT}/src/service/modules/source-materials/repository.ts`,
  `${SERVICE_ROOT}/src/service/modules/source-materials/schemas.ts`,
  `${SERVICE_ROOT}/src/service/modules/workspace/repository.ts`,
  `${SERVICE_ROOT}/src/service/modules/workspace/schemas.ts`,
]) {
  assertCondition(!(await pathExists(relPath)), `${relPath} must not exist`);
}

console.log("chatgpt-corpus service shape verified");
