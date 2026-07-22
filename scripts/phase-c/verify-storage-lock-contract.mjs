#!/usr/bin/env bun
import { assertCondition, mustExist } from "./_verify-utils.mjs";
import fs from "node:fs/promises";

await Promise.all([
  mustExist("scripts/architecture/verify-app-composition-authoring.mjs"),
  mustExist("apps/server/test/rawr.test.ts"),
]);
for (const relPath of [
  "services/hq-ops/src/service/modules/repo-state/helpers/storage.ts",
  "apps/server/test/repo-state-store.concurrent.test.ts",
  "apps/server/test/storage-lock-route-guard.test.ts",
]) {
  const absent = await fs.access(relPath).then(
    () => false,
    () => true
  );
  assertCondition(absent, `${relPath} must remain retired`);
}

console.log("phase-c retired storage authority verified absent");
