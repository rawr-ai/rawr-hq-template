#!/usr/bin/env bun
import { assertCondition, mustExist, readFile } from "./_verify-utils.mjs";

function hasExportedFunction(source, fnName) {
  return new RegExp(`export\\s+async\\s+function\\s+${fnName}\\s*\\(`, "m").test(source) ||
    new RegExp(`export\\s+function\\s+${fnName}\\s*\\(`, "m").test(source);
}

function functionBodyCalls(source, fnName, calleeName) {
  const pattern = new RegExp(
    `export\\s+(?:async\\s+)?function\\s+${fnName}\\s*\\([^)]*\\)\\s*(?::[^\\{]+)?\\{[\\s\\S]*?\\b${calleeName}\\s*\\(`,
    "m",
  );
  return pattern.test(source);
}

await Promise.all([
  mustExist("packages/hq-ops-host/src/repo-state-store.ts"),
  mustExist("apps/server/test/repo-state-store.concurrent.test.ts"),
  mustExist("apps/server/test/storage-lock-route-guard.test.ts"),
]);

const [repoStateStorageSource, repoStateTestSource] = await Promise.all([
  readFile("packages/hq-ops-host/src/repo-state-store.ts"),
  readFile("apps/server/test/repo-state-store.concurrent.test.ts"),
]);

for (const fnName of [
  "getRepoState",
  "setRepoState",
  "enablePlugin",
  "disablePlugin",
  "mutateRepoStateAtomically",
  "stateLockPath",
]) {
  assertCondition(hasExportedFunction(repoStateStorageSource, fnName), `repo-state storage must export ${fnName}`);
}

for (const fnName of ["setRepoState", "enablePlugin", "disablePlugin"]) {
  assertCondition(
    functionBodyCalls(repoStateStorageSource, fnName, "mutateRepoStateAtomically"),
    `${fnName} must call mutateRepoStateAtomically`,
  );
}

for (const typeName of ["RepoStateMutationOptions", "RepoStateMutationResult", "RepoStateMutator"]) {
  assertCondition(
    new RegExp(`type\\s+${typeName}\\s*=`, "m").test(repoStateStorageSource),
    `repo-state store must declare ${typeName}`,
  );
}

assertCondition(
  /uses one authority root across canonical and alias repo paths/u.test(repoStateTestSource),
  "repo-state runtime test must cover canonical and alias repo paths",
);

console.log("phase-c storage-lock contract verified");
