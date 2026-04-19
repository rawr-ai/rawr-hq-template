#!/usr/bin/env bun
import {
  assertCondition,
  mustExist,
  readFile,
  readPackageScripts,
} from "./_verify-utils.mjs";

await Promise.all([
  mustExist("apps/hq/rawr.hq.ts"),
  mustExist("apps/hq/src/manifest.ts"),
  mustExist("apps/hq/test/runtime-router.test.ts"),
  mustExist("apps/hq/test/orpc-contract-drift.test.ts"),
  mustExist("apps/hq/test/workflow-trigger-contract-drift.test.ts"),
  mustExist("scripts/phase-1/verify-no-live-coordination.mjs"),
]);

const [
  shellSource,
  manifestCompatSource,
  runtimeRouterTestSource,
  contractDriftTestSource,
  workflowDriftTestSource,
  phase1NoLiveCoordinationSource,
  scripts,
] = await Promise.all([
  readFile("apps/hq/rawr.hq.ts"),
  readFile("apps/hq/src/manifest.ts"),
  readFile("apps/hq/test/runtime-router.test.ts"),
  readFile("apps/hq/test/orpc-contract-drift.test.ts"),
  readFile("apps/hq/test/workflow-trigger-contract-drift.test.ts"),
  readFile("scripts/phase-1/verify-no-live-coordination.mjs"),
  readPackageScripts(),
]);

assertCondition(
  shellSource.includes("workflows: {} as const") &&
    !shellSource.includes("registerCoordinationApiPlugin") &&
    !shellSource.includes("registerSupportExampleWorkflowPlugin") &&
    manifestCompatSource.includes('export { createRawrHqManifest } from "../rawr.hq";'),
  "apps/hq/rawr.hq.ts must keep archived workflow families out of live publication while src/manifest.ts stays a thin forwarder",
);
assertCondition(
  !runtimeRouterTestSource.includes("finished-hook") &&
    runtimeRouterTestSource.includes("keeps the canonical app shell cold and explicit about role/surface membership"),
  "runtime-router.test.ts must prove the live HQ runtime seam does not regain finished-hook behavior",
);
assertCondition(
  !contractDriftTestSource.includes("finalization") &&
    contractDriftTestSource.includes('expect(Object.keys(manifest.roles.async.workflows)).toEqual([])') &&
    workflowDriftTestSource.includes("keeps workflow publication empty once the false-future lane is archived"),
  "HQ drift tests must encode empty workflow publication rather than additive finished-hook policy",
);
assertCondition(
  phase1NoLiveCoordinationSource.includes("plugins/workflows/coordination") &&
    phase1NoLiveCoordinationSource.includes("must not exist in the live tree"),
  "Phase 1 archive proof must keep coordination workflow roots out of the live tree",
);

assertCondition(
  scripts["phase-e:gate:e2-finished-hook-policy"] === "bun scripts/phase-e/verify-e2-finished-hook-policy.mjs",
  "package.json must define phase-e:gate:e2-finished-hook-policy",
);
assertCondition(
  scripts["phase-e:gate:e2-finished-hook-runtime"] ===
    "bunx vitest run --project hq-app apps/hq/test/runtime-router.test.ts",
  "package.json must define phase-e:gate:e2-finished-hook-runtime",
);
assertCondition(
  scripts["phase-e:e2:quick"] ===
    "bun run phase-e:e1:quick && bun run phase-e:gate:e2-finished-hook-policy && bun run phase-e:gate:e2-finished-hook-runtime",
  "package.json must define phase-e:e2:quick",
);
assertCondition(
  scripts["phase-e:e2:full"] ===
    "bun run phase-e:e2:quick && bunx vitest run --project hq-app apps/hq/test/orpc-contract-drift.test.ts",
  "package.json must define phase-e:e2:full",
);

console.log("phase-e e2 archive-lane policy verified");
