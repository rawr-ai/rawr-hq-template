#!/usr/bin/env bun
import { mustExist, readFile, writeJsonIfChanged } from "./_verify-utils.mjs";

const PASS_ROOT = "docs/projects/orpc-ingest-workflows-spec/_phase-d-runtime-execution-pass-01-2026-02-21";
const RESULT_PATH = `${PASS_ROOT}/D4_FINISHED_HOOK_SCAN_RESULT.json`;

await Promise.all([
  mustExist("services/coordination/src/domain/types.ts"),
  mustExist("services/coordination/src/domain/schemas.ts"),
  mustExist("plugins/workflows/coordination/src/inngest.ts"),
  mustExist("services/coordination/src/service/modules/runs/router.ts"),
  mustExist("plugins/workflows/coordination/test/inngest-finished-hook-guardrails.test.ts"),
]);

const [typesSource, schemasSource, inngestSource, coordinationRouterSource, guardrailsTestSource] = await Promise.all([
  readFile("services/coordination/src/domain/types.ts"),
  readFile("services/coordination/src/domain/schemas.ts"),
  readFile("plugins/workflows/coordination/src/inngest.ts"),
  readFile("services/coordination/src/service/modules/runs/router.ts"),
  readFile("plugins/workflows/coordination/test/inngest-finished-hook-guardrails.test.ts"),
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
    message: "workflow plugin inngest.ts executes finished-hook side effects through guardrails",
    pass: /executeFinishedHookWithGuardrails\(/.test(inngestSource),
  },
  {
    id: "adapter-non-critical-failure",
    message: "workflow plugin inngest.ts captures failed finished-hook outcomes without escalating run failure",
    pass:
      /outcome:\s*"failed"/.test(inngestSource) &&
      /finalization:\s*createRunFinalizationState\(finishedHookState\)/.test(inngestSource),
  },
  {
    id: "runtime-router-fallback-contract",
    message: "coordination run module queue fallback includes explicit finalization contract",
    pass: /finalization:\s*\{\s*contract:\s*RUN_FINALIZATION_CONTRACT_V1,?\s*\}/m.test(coordinationRouterSource),
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
