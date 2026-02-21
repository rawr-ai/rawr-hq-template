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
  mustExist("packages/state/src/repo-state.ts"),
  mustExist("packages/state/src/types.ts"),
  mustExist("packages/state/src/index.ts"),
  mustExist("packages/state/test/repo-state.concurrent.test.ts"),
  mustExist("packages/coordination/test/storage-lock-cross-instance.test.ts"),
  mustExist("apps/server/test/storage-lock-route-guard.test.ts"),
]);

const [repoStateSource, typesSource, indexSource] = await Promise.all([
  readFile("packages/state/src/repo-state.ts"),
  readFile("packages/state/src/types.ts"),
  readFile("packages/state/src/index.ts"),
]);

for (const fnName of [
  "getRepoState",
  "setRepoState",
  "enablePlugin",
  "disablePlugin",
  "mutateRepoStateAtomically",
  "stateLockPath",
]) {
  assertCondition(hasExportedFunction(repoStateSource, fnName), `repo-state must export ${fnName}`);
}

for (const fnName of ["setRepoState", "enablePlugin", "disablePlugin"]) {
  assertCondition(
    functionBodyCalls(repoStateSource, fnName, "mutateRepoStateAtomically"),
    `${fnName} must call mutateRepoStateAtomically`,
  );
}

for (const typeName of ["RepoStateMutationOptions", "RepoStateMutationResult", "RepoStateMutator"]) {
  assertCondition(
    new RegExp(`export\\s+type\\s+${typeName}\\s*=`, "m").test(typesSource),
    `types.ts must export ${typeName}`,
  );
}

for (const typeName of ["RepoState", "RepoStateMutationOptions", "RepoStateMutationResult", "RepoStateMutator"]) {
  assertCondition(indexSource.includes(typeName), `index.ts must re-export ${typeName}`);
}

for (const valueName of ["mutateRepoStateAtomically", "stateLockPath"]) {
  assertCondition(indexSource.includes(valueName), `index.ts must re-export ${valueName}`);
}

console.log("phase-c storage-lock contract verified");
