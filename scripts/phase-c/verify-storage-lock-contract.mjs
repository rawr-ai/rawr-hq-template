#!/usr/bin/env bun
import { assertCondition, mustExist, readFile } from "./_verify-utils.mjs";

function hasExportedFunction(source, fnName) {
  return new RegExp(`export\\s+async\\s+function\\s+${fnName}\\s*\\(`, "m").test(source) ||
    new RegExp(`export\\s+function\\s+${fnName}\\s*\\(`, "m").test(source);
}

await Promise.all([
  mustExist("services/hq-ops/src/service/modules/repo-state/helpers/storage.ts"),
  mustExist("apps/server/test/repo-state-store.concurrent.test.ts"),
  mustExist("apps/server/test/storage-lock-route-guard.test.ts"),
]);

const [repoStateStorageSource, repoStateEntitiesSource, repoStateTestSource] = await Promise.all([
  readFile("services/hq-ops/src/service/modules/repo-state/helpers/storage.ts"),
  readFile("services/hq-ops/src/service/modules/repo-state/entities.ts"),
  readFile("apps/server/test/repo-state-store.concurrent.test.ts"),
]);

for (const fnName of [
  "getRepoStateWithAuthority",
  "mutateRepoStateAtomically",
  "stateLockPath",
  "statePath",
]) {
  assertCondition(hasExportedFunction(repoStateStorageSource, fnName), `repo-state storage helper must export ${fnName}`);
}

for (const typeName of ["RepoStateMutationOptions", "RepoStateMutationResult", "RepoStateMutator"]) {
  assertCondition(
    new RegExp(`type\\s+${typeName}\\s*=`, "m").test(repoStateEntitiesSource),
    `repo-state store must declare ${typeName}`,
  );
}

assertCondition(
  /uses one authority root across canonical and alias repo paths/u.test(repoStateTestSource),
  "repo-state runtime test must cover canonical and alias repo paths",
);

console.log("phase-c storage-lock contract verified");
