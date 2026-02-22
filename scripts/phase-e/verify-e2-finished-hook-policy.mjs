#!/usr/bin/env bun
import {
  assertCondition,
  mustExist,
  readFile,
  readPackageScripts,
} from "./_verify-utils.mjs";

await Promise.all([
  mustExist("packages/coordination/src/types.ts"),
  mustExist("packages/coordination/src/orpc/schemas.ts"),
  mustExist("packages/coordination-inngest/src/adapter.ts"),
  mustExist("packages/coordination-inngest/test/inngest-finished-hook-guardrails.test.ts"),
]);

const [typesSource, schemasSource, adapterSource, guardrailsTestSource, scripts] = await Promise.all([
  readFile("packages/coordination/src/types.ts"),
  readFile("packages/coordination/src/orpc/schemas.ts"),
  readFile("packages/coordination-inngest/src/adapter.ts"),
  readFile("packages/coordination-inngest/test/inngest-finished-hook-guardrails.test.ts"),
  readPackageScripts(),
]);

assertCondition(
  /export type RunFinishedHookOutcomeV1 = "succeeded" \| "failed" \| "skipped";/.test(typesSource),
  "types.ts must encode succeeded/failed/skipped finished-hook outcomes",
);
assertCondition(
  /nonCritical:\s*true;/.test(typesSource) &&
    /idempotencyRequired:\s*true;/.test(typesSource) &&
    /timeoutMs:\s*number;/.test(typesSource),
  "RunFinishedHookStateV1 must encode non-critical/idempotency-required/timeout fields",
);

assertCondition(
  /outcome:\s*Type\.Union\(\[Type\.Literal\("succeeded"\), Type\.Literal\("failed"\), Type\.Literal\("skipped"\)\]\)/.test(
    schemasSource,
  ),
  "RunFinishedHookStateSchema must include skipped outcome",
);
assertCondition(
  /nonCritical:\s*Type\.Literal\(true\)/.test(schemasSource) &&
    /idempotencyRequired:\s*Type\.Literal\(true\)/.test(schemasSource) &&
    /timeoutMs:\s*Type\.Integer\(\{ minimum: 1 \}\)/.test(schemasSource),
  "RunFinishedHookStateSchema must include nonCritical/idempotencyRequired/timeoutMs fields",
);

assertCondition(
  /const FINISHED_HOOK_TIMEOUT_MS = 5_000;/.test(adapterSource),
  "adapter.ts must define canonical finished-hook timeout",
);
assertCondition(
  /async function runWithTimeout<[^>]+>\(/.test(adapterSource),
  "adapter.ts must wrap finished-hook execution in timeout helper",
);
assertCondition(
  /if \(!input\.hook\) \{[\s\S]*outcome: "skipped"/.test(adapterSource),
  "adapter.ts must record skipped state when no finished hook is configured",
);

assertCondition(
  guardrailsTestSource.includes("marks finished-hook state as skipped when no hook is configured"),
  "finished-hook guardrail tests must cover skipped outcome behavior",
);

assertCondition(
  scripts["phase-e:gate:e2-finished-hook-policy"] === "bun scripts/phase-e/verify-e2-finished-hook-policy.mjs",
  "package.json must define phase-e:gate:e2-finished-hook-policy",
);
assertCondition(
  scripts["phase-e:gate:e2-finished-hook-runtime"] ===
    "bunx vitest run --project coordination-inngest packages/coordination-inngest/test/inngest-finished-hook-guardrails.test.ts",
  "package.json must define phase-e:gate:e2-finished-hook-runtime",
);
assertCondition(
  scripts["phase-e:e2:quick"] ===
    "bun run phase-e:e1:quick && bun run phase-e:gate:e2-finished-hook-policy && bun run phase-e:gate:e2-finished-hook-runtime",
  "package.json must define phase-e:e2:quick",
);
assertCondition(
  scripts["phase-e:e2:full"] ===
    "bun run phase-e:e2:quick && bunx vitest run --project core packages/core/test/orpc-contract-drift.test.ts",
  "package.json must define phase-e:e2:full",
);

console.log("phase-e e2 finished-hook policy verified");
