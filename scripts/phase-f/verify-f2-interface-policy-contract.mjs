#!/usr/bin/env bun
import fs from "node:fs/promises";
import {
  assertCondition,
  assertScriptEquals,
  mustExist,
  readFile,
  readPackageScripts,
} from "./_verify-utils.mjs";

await Promise.all([
  mustExist("apps/hq/rawr.hq.ts"),
  mustExist("apps/hq/src/manifest.ts"),
  mustExist("apps/hq/legacy-cutover.ts"),
  mustExist("apps/hq/test/orpc-contract-drift.test.ts"),
  mustExist("apps/hq/test/workflow-trigger-contract-drift.test.ts"),
  mustExist("apps/hq/test/runtime-router.test.ts"),
]);

for (const relPath of [
  "services/hq-ops/src/service/modules/repo-state/contract.ts",
  "services/hq-ops/src/service/modules/repo-state/router.ts",
  "plugins/server/api/state/package.json",
]) {
  const present = await fs.access(relPath).then(() => true, () => false);
  assertCondition(!present, `${relPath} must remain retired`);
}

const [
  shellSource,
  manifestCompatSource,
  legacyCutoverSource,
  hqDriftTestSource,
  triggerDriftTestSource,
  runtimeRouterTestSource,
  hqOpsContractSource,
  scripts,
] = await Promise.all([
  readFile("apps/hq/rawr.hq.ts"),
  readFile("apps/hq/src/manifest.ts"),
  readFile("apps/hq/legacy-cutover.ts"),
  readFile("apps/hq/test/orpc-contract-drift.test.ts"),
  readFile("apps/hq/test/workflow-trigger-contract-drift.test.ts"),
  readFile("apps/hq/test/runtime-router.test.ts"),
  readFile("services/hq-ops/src/service/contract.ts"),
  readPackageScripts(),
]);

assertScriptEquals(
  scripts,
  "phase-f:gate:f2-interface-policy-contract",
  "bun scripts/phase-f/verify-f2-interface-policy-contract.mjs",
);
assertScriptEquals(
  scripts,
  "phase-f:gate:f2-interface-policy-runtime",
  "bunx vitest run --project hq-app apps/hq/test/orpc-contract-drift.test.ts apps/hq/test/workflow-trigger-contract-drift.test.ts && bunx vitest run --project hq-app apps/hq/test/runtime-router.test.ts",
);
assertScriptEquals(
  scripts,
  "phase-f:f2:quick",
  "bun run phase-f:f1:quick && bun run phase-f:gate:f2-interface-policy-contract && bun run phase-f:gate:f2-interface-policy-runtime",
);
assertScriptEquals(scripts, "phase-f:f2:full", "bun run phase-f:f2:quick && bun run typecheck");

assertCondition(
  shellSource.includes("registerExampleTodoApiPlugin") &&
    !shellSource.includes("registerStateApiPlugin") &&
    shellSource.includes("workflows: {} as const") &&
    manifestCompatSource.includes('export { createRawrHqManifest } from "../rawr.hq";'),
  "HQ manifest must retain only the surviving exampleTodo declaration and empty async role",
);
assertCondition(
  !hqOpsContractSource.includes("repoState") &&
    !hqOpsContractSource.includes("./modules/repo-state/contract"),
  "HQ Ops public contract must not retain repo-state membership authority",
);
assertCondition(
  legacyCutoverSource.includes("../server/src/host-composition") &&
    !legacyCutoverSource.includes("../server/src/host-seam") &&
    !legacyCutoverSource.includes("../server/src/host-realization"),
  "the existing bridge must remain localized until the canonical runtime migration replaces it",
);
assertCondition(
  runtimeRouterTestSource.includes("keeps the canonical app shell cold and explicit about role/surface membership") &&
    !runtimeRouterTestSource.includes("enabledPlugins"),
  "HQ runtime proof must keep the shell cold without legacy membership state",
);
assertCondition(
  hqDriftTestSource.includes('expect(Object.keys(manifest.roles.server.api)).toEqual(["exampleTodo"])') &&
    !hqDriftTestSource.includes("manifest.roles.server.api.state") &&
    triggerDriftTestSource.includes("workflow publication empty once the false-future lane is archived"),
  "HQ drift tests must assert the surviving declaration and empty workflow publication",
);

console.log("phase-f f2 retired membership interface contract verified");
