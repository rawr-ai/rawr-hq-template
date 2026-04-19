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
  mustExist("services/state/src/repo-state/index.ts"),
  mustExist("services/state/src/repo-state/model.ts"),
  mustExist("services/state/src/repo-state/storage.ts"),
  mustExist("services/state/src/index.ts"),
  mustExist("services/state/test/repo-state.concurrent.test.ts"),
  mustExist("apps/server/test/storage-lock-route-guard.test.ts"),
]);

const [repoStateIndexSource, repoStateModelSource, repoStateStorageSource, indexSource] = await Promise.all([
  readFile("services/state/src/repo-state/index.ts"),
  readFile("services/state/src/repo-state/model.ts"),
  readFile("services/state/src/repo-state/storage.ts"),
  readFile("services/state/src/index.ts"),
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
    new RegExp(`export\\s+type\\s+${typeName}\\s*=`, "m").test(repoStateModelSource),
    `repo-state model must export ${typeName}`,
  );
}

for (const typeName of ["RepoState", "RepoStateMutationOptions", "RepoStateMutationResult", "RepoStateMutator"]) {
  assertCondition(repoStateIndexSource.includes(typeName), `repo-state index must re-export ${typeName}`);
}

for (const valueName of ["mutateRepoStateAtomically", "stateLockPath"]) {
  assertCondition(repoStateIndexSource.includes(valueName), `repo-state index must re-export ${valueName}`);
}

assertCondition(
  !indexSource.includes("getRepoState") && !indexSource.includes("RepoState"),
  "package root must stay thin and not re-export repo-state support surface",
);

console.log("phase-c storage-lock contract verified");
