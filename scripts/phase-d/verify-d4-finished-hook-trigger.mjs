#!/usr/bin/env bun
import { mustExist, readFile, writeJsonIfChanged } from "./_verify-utils.mjs";

const PASS_ROOT = "docs/projects/orpc-ingest-workflows-spec/_phase-d-runtime-execution-pass-01-2026-02-21";
const RESULT_PATH = `${PASS_ROOT}/D4_FINISHED_HOOK_SCAN_RESULT.json`;

await Promise.all([
  mustExist("packages/coordination/src/types.ts"),
  mustExist("packages/coordination/src/orpc/schemas.ts"),
  mustExist("packages/coordination-inngest/src/adapter.ts"),
  mustExist("packages/core/src/orpc/runtime-router.ts"),
  mustExist("packages/coordination-inngest/test/inngest-finished-hook-guardrails.test.ts"),
]);

const [typesSource, schemasSource, adapterSource, runtimeRouterSource, guardrailsTestSource] = await Promise.all([
  readFile("packages/coordination/src/types.ts"),
  readFile("packages/coordination/src/orpc/schemas.ts"),
  readFile("packages/coordination-inngest/src/adapter.ts"),
  readFile("packages/core/src/orpc/runtime-router.ts"),
  readFile("packages/coordination-inngest/test/inngest-finished-hook-guardrails.test.ts"),
]);

const checks = [
  {
    id: "types-finalization-contract",
    message: "types.ts encodes non-exactly-once + idempotent/non-critical finalization contract",
    pass:
      /exactlyOnce:\s*false/.test(typesSource) &&
      /sideEffectPolicy:\s*"idempotent-non-critical"/.test(typesSource) &&
      /failureMode:\s*"best-effort-non-blocking"/.test(typesSource),
  },
  {
    id: "schemas-finalization-contract",
    message: "schemas.ts exposes additive optional finalization contract",
    pass:
      /finalization:\s*Type\.Optional\(RunFinalizationStateSchema\)/.test(schemasSource) &&
      schemasSource.includes("idempotent-non-critical"),
  },
  {
    id: "adapter-guardrails",
    message: "adapter.ts executes finished-hook side effects through guardrails",
    pass: /executeFinishedHookWithGuardrails\(/.test(adapterSource),
  },
  {
    id: "adapter-non-critical-failure",
    message: "adapter.ts captures failed finished-hook outcomes without escalating run failure",
    pass:
      /outcome:\s*"failed"/.test(adapterSource) &&
      /finalization:\s*createRunFinalizationState\(finishedHookState\)/.test(adapterSource),
  },
  {
    id: "runtime-router-fallback-contract",
    message: "runtime-router queue fallback includes explicit finalization contract",
    pass: /finalization:\s*\{\s*contract:\s*RUN_FINALIZATION_CONTRACT_V1,?\s*\}/m.test(runtimeRouterSource),
  },
  {
    id: "guardrails-runtime-tests",
    message: "runtime tests assert non-critical/idempotent finished-hook behavior",
    pass:
      guardrailsTestSource.includes("treats finished-hook failures as non-critical") &&
      guardrailsTestSource.includes("exactlyOnce"),
  },
];

const failedChecks = checks.filter((check) => !check.pass);
const triggered = failedChecks.length > 0;

const result = {
  criterion: "d4-finished-hook-scan",
  triggerRule: "state-mutating or external finished-hook side effects without explicit idempotent/non-critical contract",
  triggered,
  summary: triggered
    ? "Trigger criterion met: finished-hook guardrail contract drift detected."
    : "No finished-hook guardrail drift detected in D2-owned contract/runtime assertions.",
  checks,
  failedCheckIds: failedChecks.map((check) => check.id),
};

const writeResult = await writeJsonIfChanged(RESULT_PATH, result);

if (triggered) {
  console.log("phase-d d4 finished-hook scan: TRIGGERED");
  for (const check of failedChecks) {
    console.log(` - ${check.id}: ${check.message}`);
  }
} else {
  console.log("phase-d d4 finished-hook scan: clear");
}
console.log(`wrote ${RESULT_PATH}${writeResult.changed ? "" : " (unchanged)"}`);
