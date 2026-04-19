#!/usr/bin/env bun
import { assertCondition, mustExist, readFile, readPackageScripts } from "./_verify-utils.mjs";

await Promise.all([
  mustExist("apps/hq/src/manifest.ts"),
  mustExist("apps/hq/test/runtime-router.test.ts"),
  mustExist("apps/hq/test/orpc-contract-drift.test.ts"),
  mustExist("apps/hq/test/workflow-trigger-contract-drift.test.ts"),
  mustExist("scripts/phase-1/verify-no-live-coordination.mjs"),
  mustExist("scripts/phase-1/verify-no-live-support-example.mjs"),
]);

const [
  manifestSource,
  runtimeRouterTestSource,
  contractDriftTestSource,
  workflowDriftTestSource,
  phase1NoLiveCoordinationSource,
  phase1NoLiveSupportExampleSource,
  scripts,
] = await Promise.all([
  readFile("apps/hq/src/manifest.ts"),
  readFile("apps/hq/test/runtime-router.test.ts"),
  readFile("apps/hq/test/orpc-contract-drift.test.ts"),
  readFile("apps/hq/test/workflow-trigger-contract-drift.test.ts"),
  readFile("scripts/phase-1/verify-no-live-coordination.mjs"),
  readFile("scripts/phase-1/verify-no-live-support-example.mjs"),
  readPackageScripts(),
]);

assertCondition(
  manifestSource.includes("workflows: {} as const") &&
    !manifestSource.includes("registerCoordinationApiPlugin") &&
    !manifestSource.includes("registerSupportExampleWorkflowPlugin") &&
    !manifestSource.includes("createHqRuntimeRouter"),
  "apps/hq/src/manifest.ts must keep the workflow publication lane empty after U01",
);
assertCondition(
  runtimeRouterTestSource.includes("keeps the manifest cold and free of executable materialization") &&
    runtimeRouterTestSource.includes("does not preserve the old executable bridge in testing or rawr.hq.ts") &&
    runtimeRouterTestSource.includes('expect(packageJson.exports?.["./testing"]).toBeUndefined()'),
  "runtime-router.test.ts must guard the frozen no-workflow HQ runtime seam",
);
assertCondition(
  contractDriftTestSource.includes('expect(Object.keys(manifest.plugins.api)).toEqual(["state", "exampleTodo"])') &&
    contractDriftTestSource.includes("expect(Object.keys(manifest.plugins.workflows)).toEqual([])") &&
    contractDriftTestSource.includes("declaration?.published?.contract"),
  "orpc-contract-drift.test.ts must assert the post-U01 API selection and empty workflow publication",
);
assertCondition(
  workflowDriftTestSource.includes("keeps workflow publication empty once the false-future lane is archived"),
  "workflow-trigger-contract-drift.test.ts must assert the archived workflow lane stays unpublished",
);
assertCondition(
  phase1NoLiveCoordinationSource.includes("plugins/workflows/coordination") &&
    phase1NoLiveCoordinationSource.includes("must not exist in the live tree") &&
    phase1NoLiveSupportExampleSource.includes("plugins/workflows/support-example") &&
    phase1NoLiveSupportExampleSource.includes("must not exist in the live tree"),
  "Phase 1 archive proofs must keep both false-future workflow lanes out of the live tree",
);

assertCondition(
  scripts["phase-d:gate:d2-finished-hook-contract"] === "bun scripts/phase-d/verify-d2-finished-hook-contract.mjs",
  "package.json must define phase-d:gate:d2-finished-hook-contract",
);
assertCondition(
  scripts["phase-d:gate:d2-finished-hook-runtime"] ===
    "bunx vitest run --project hq-app apps/hq/test/runtime-router.test.ts",
  "package.json must define phase-d:gate:d2-finished-hook-runtime",
);
assertCondition(
  scripts["phase-d:d2:quick"] ===
    "bun run phase-d:gate:drift-core && bun run phase-d:gate:d2-finished-hook-contract && bun run phase-d:gate:d2-finished-hook-runtime",
  "package.json must define phase-d:d2:quick chain",
);
assertCondition(
  scripts["phase-d:d2:full"] ===
    "bun run phase-d:d2:quick && bunx vitest run --project hq-app apps/hq/test/orpc-contract-drift.test.ts && bunx vitest run --project hq-app apps/hq/test/workflow-trigger-contract-drift.test.ts",
  "package.json must define phase-d:d2:full chain",
);

console.log("phase-d d2 archive-lane closure contract verified");
