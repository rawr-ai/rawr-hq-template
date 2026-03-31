#!/usr/bin/env bun
import {
  assertCondition,
  assertScriptEquals,
  mustExist,
  readFile,
  readPackageScripts,
} from "./_verify-utils.mjs";

await Promise.all([
  mustExist("services/hq-ops/src/service/modules/repo-state/contract.ts"),
  mustExist("services/hq-ops/src/service/modules/repo-state/router.ts"),
  mustExist("apps/hq/src/manifest.ts"),
  mustExist("apps/hq/test/orpc-contract-drift.test.ts"),
  mustExist("apps/hq/test/workflow-trigger-contract-drift.test.ts"),
  mustExist("apps/hq/test/runtime-router.test.ts"),
]);

const [
  repoStateContractSource,
  repoStateRouterSource,
  manifestSource,
  hqDriftTestSource,
  triggerDriftTestSource,
  runtimeRouterTestSource,
  scripts,
] =
  await Promise.all([
    readFile("services/hq-ops/src/service/modules/repo-state/contract.ts"),
    readFile("services/hq-ops/src/service/modules/repo-state/router.ts"),
    readFile("apps/hq/src/manifest.ts"),
    readFile("apps/hq/test/orpc-contract-drift.test.ts"),
    readFile("apps/hq/test/workflow-trigger-contract-drift.test.ts"),
    readFile("apps/hq/test/runtime-router.test.ts"),
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

const checks = [
  {
    id: "repo-state-contract-authority-output",
    message: "repo-state contract output must include additive authorityRepoRoot field",
    pass:
      /authorityRepoRoot: Type\.String\(\{ minLength: 1 \}\)/u.test(repoStateContractSource),
  },
  {
    id: "repo-state-router-authority-output",
    message: "repo-state router must surface authorityRepoRoot via the canonical authority-aware repo API",
    pass:
      /const \{ state, authorityRepoRoot \} = await context\.repo\.getStateWithAuthority\(\);/u.test(repoStateRouterSource) &&
      /authorityRepoRoot,/u.test(repoStateRouterSource),
  },
  {
    id: "hq-manifest-selection",
    message: "hq app manifest must publish state and exampleTodo while keeping workflows empty",
    pass:
      manifestSource.includes("registerStateApiPlugin") &&
      manifestSource.includes("registerExampleTodoApiPlugin") &&
      manifestSource.includes("workflows: {} as const") &&
      !manifestSource.includes("registerCoordinationApiPlugin") &&
      !manifestSource.includes("createHqRuntimeRouter"),
  },
  {
    id: "hq-manifest-runtime-coldness",
    message: "hq app runtime proof must keep the manifest cold and free of executable materialization",
    pass:
      runtimeRouterTestSource.includes("keeps the manifest cold and free of executable materialization") &&
      !runtimeRouterTestSource.includes("finished-hook"),
  },
  {
    id: "f2-drift-tests",
    message: "hq app drift suites must assert state/exampleTodo publication and empty workflow publication",
    pass:
      /internal capability declarations selected for HQ composition/u.test(hqDriftTestSource) &&
      /state/u.test(hqDriftTestSource) &&
      /exampleTodo/u.test(hqDriftTestSource) &&
      /workflow publication empty once the false-future lane is archived/u.test(triggerDriftTestSource),
  },
];

const failedChecks = checks.filter((check) => !check.pass);
assertCondition(
  failedChecks.length === 0,
  `phase-f f2 contract drift detected: ${failedChecks.map((check) => `${check.id}: ${check.message}`).join("; ")}`,
);

console.log("phase-f f2 interface policy contract verified");
