#!/usr/bin/env bun
import { assertCondition, mustExist, readFile, readPackageScripts } from "./_verify-utils.mjs";

await Promise.all([
  mustExist("packages/coordination/src/types.ts"),
  mustExist("packages/coordination/src/orpc/schemas.ts"),
  mustExist("packages/coordination/src/orpc/contract.ts"),
  mustExist("packages/coordination-inngest/src/adapter.ts"),
  mustExist("packages/core/src/orpc/runtime-router.ts"),
  mustExist("packages/coordination-inngest/test/inngest-finished-hook-guardrails.test.ts"),
  mustExist("packages/core/test/runtime-router.test.ts"),
  mustExist("packages/core/test/orpc-contract-drift.test.ts"),
  mustExist("packages/core/test/workflow-trigger-contract-drift.test.ts"),
]);

const [
  typesSource,
  schemasSource,
  adapterSource,
  runtimeRouterSource,
  guardrailsTestSource,
  runtimeRouterTestSource,
  contractDriftTestSource,
  workflowDriftTestSource,
  scripts,
] = await Promise.all([
  readFile("packages/coordination/src/types.ts"),
  readFile("packages/coordination/src/orpc/schemas.ts"),
  readFile("packages/coordination-inngest/src/adapter.ts"),
  readFile("packages/core/src/orpc/runtime-router.ts"),
  readFile("packages/coordination-inngest/test/inngest-finished-hook-guardrails.test.ts"),
  readFile("packages/core/test/runtime-router.test.ts"),
  readFile("packages/core/test/orpc-contract-drift.test.ts"),
  readFile("packages/core/test/workflow-trigger-contract-drift.test.ts"),
  readPackageScripts(),
]);

assertCondition(
  /export\s+type\s+RunFinalizationContractV1\s*=/.test(typesSource),
  "types.ts must export RunFinalizationContractV1",
);
assertCondition(
  /export\s+const\s+RUN_FINALIZATION_CONTRACT_V1\s*:/.test(typesSource),
  "types.ts must export RUN_FINALIZATION_CONTRACT_V1",
);
assertCondition(
  /exactlyOnce:\s*false/.test(typesSource) &&
    /sideEffectPolicy:\s*"idempotent-non-critical"/.test(typesSource) &&
    /failureMode:\s*"best-effort-non-blocking"/.test(typesSource),
  "types.ts must encode non-exactly-once and idempotent/non-critical finalization semantics",
);
assertCondition(
  /finalization\?:\s*RunFinalizationStateV1/.test(typesSource),
  "RunStatusV1 must keep finalization as additive optional field",
);

assertCondition(
  /RunFinalizationContractSchema/.test(schemasSource) && /RunFinalizationStateSchema/.test(schemasSource),
  "schemas.ts must define finalization schemas",
);
assertCondition(
  /finalization:\s*Type\.Optional\(RunFinalizationStateSchema\)/.test(schemasSource),
  "RunStatusSchema must expose optional finalization field",
);
assertCondition(
  schemasSource.includes("at-least-once") &&
    schemasSource.includes("idempotent-non-critical") &&
    schemasSource.includes("best-effort-non-blocking"),
  "RunStatusSchema finalization literals must include D2 guardrail semantics",
);

assertCondition(
  /executeFinishedHookWithGuardrails\(/.test(adapterSource),
  "adapter.ts must execute finished-hook side effects through guardrails helper",
);
assertCondition(
  /outcome:\s*"failed"/.test(adapterSource),
  "adapter.ts must capture failed finished-hook outcomes instead of throwing",
);
assertCondition(
  /finalization:\s*createRunFinalizationState\(finishedHookState\)/.test(adapterSource),
  "adapter.ts must persist finished-hook outcomes on completed/failed run statuses",
);

assertCondition(
  /finalization:\s*\{\s*contract:\s*RUN_FINALIZATION_CONTRACT_V1,?\s*\}/m.test(runtimeRouterSource),
  "runtime-router.ts queue failure fallback must include explicit finalization contract",
);

assertCondition(
  guardrailsTestSource.includes("treats finished-hook failures as non-critical") &&
    guardrailsTestSource.includes("exactlyOnce"),
  "D2 runtime tests must cover non-critical finished-hook behavior and non-exactly-once semantics",
);
assertCondition(
  runtimeRouterTestSource.includes("does not introduce finished-hook route families"),
  "runtime-router.test.ts must assert route-family invariants remain unchanged under D2",
);
assertCondition(
  contractDriftTestSource.includes("finalization") && workflowDriftTestSource.includes("finalization"),
  "core drift tests must verify additive finalization schema exposure",
);

assertCondition(
  scripts["phase-d:gate:d2-finished-hook-contract"] === "bun scripts/phase-d/verify-d2-finished-hook-contract.mjs",
  "package.json must define phase-d:gate:d2-finished-hook-contract",
);
assertCondition(
  scripts["phase-d:gate:d2-finished-hook-runtime"] ===
    "bunx vitest run --project coordination-inngest packages/coordination-inngest/test/inngest-finished-hook-guardrails.test.ts && bunx vitest run --project core packages/core/test/runtime-router.test.ts",
  "package.json must define phase-d:gate:d2-finished-hook-runtime",
);
assertCondition(
  scripts["phase-d:d2:quick"] ===
    "bun run phase-d:gate:drift-core && bun run phase-d:gate:d2-finished-hook-contract && bun run phase-d:gate:d2-finished-hook-runtime",
  "package.json must define phase-d:d2:quick chain",
);
assertCondition(
  scripts["phase-d:d2:full"] ===
    "bun run phase-d:d2:quick && bunx vitest run --project core packages/core/test/orpc-contract-drift.test.ts && bunx vitest run --project core packages/core/test/workflow-trigger-contract-drift.test.ts",
  "package.json must define phase-d:d2:full chain",
);

console.log("phase-d d2 finished-hook contract verified");
