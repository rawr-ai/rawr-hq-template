#!/usr/bin/env bun
import {
  assertCondition,
  assertScriptEquals,
  mustExist,
  readFile,
  readPackageScripts,
} from "./_verify-utils.mjs";

await Promise.all([
  mustExist("services/coordination/src/ids.ts"),
  mustExist("services/coordination/src/schemas.ts"),
  mustExist("services/coordination/src/service/shared/inputs.ts"),
  mustExist("services/state/src/service/contract.ts"),
  mustExist("services/state/src/service/router.ts"),
  mustExist("apps/hq/src/manifest.ts"),
  mustExist("apps/hq/test/orpc-contract-drift.test.ts"),
  mustExist("apps/hq/test/workflow-trigger-contract-drift.test.ts"),
]);

const [
  idsSource,
  schemasSource,
  inputsSource,
  stateContractSource,
  stateRouterSource,
  manifestSource,
  hqDriftTestSource,
  triggerDriftTestSource,
  scripts,
] =
  await Promise.all([
    readFile("services/coordination/src/ids.ts"),
    readFile("services/coordination/src/schemas.ts"),
    readFile("services/coordination/src/service/shared/inputs.ts"),
    readFile("services/state/src/service/contract.ts"),
    readFile("services/state/src/service/router.ts"),
    readFile("apps/hq/src/manifest.ts"),
    readFile("apps/hq/test/orpc-contract-drift.test.ts"),
    readFile("apps/hq/test/workflow-trigger-contract-drift.test.ts"),
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
    id: "ids-policy-constants",
    message: "coordination IDs must expose shared policy constants",
    pass:
      idsSource.includes('COORDINATION_ID_PATTERN_SOURCE = "[A-Za-z0-9][A-Za-z0-9._-]{0,127}"') &&
      idsSource.includes("COORDINATION_ID_TRIMMED_PATTERN_SOURCE") &&
      idsSource.includes("COORDINATION_ID_MAX_LENGTH = 128"),
  },
  {
    id: "ids-normalization",
    message: "coordination IDs must normalize via trim + safety check",
    pass:
      /function normalizeCoordinationId\(value: string\): string \| null/u.test(idsSource) &&
      /const trimmed = value\.trim\(\);/u.test(idsSource) &&
      /return isSafeCoordinationId\(trimmed\) \? trimmed : null;/u.test(idsSource),
  },
  {
    id: "schema-canonical-id",
    message: "canonical coordination schema must use bounded canonical pattern",
    pass:
      /const CoordinationIdSchema = Type\.String\([\s\S]*maxLength: COORDINATION_ID_MAX_LENGTH,[\s\S]*pattern: `\^\$\{COORDINATION_ID_PATTERN_SOURCE\}\$`/u.test(
        schemasSource,
      ),
  },
  {
    id: "schema-input-id",
    message: "input coordination schema must allow trim-compatible IDs",
    pass:
      /const CoordinationIdInputSchema = Type\.String\([\s\S]*pattern: COORDINATION_ID_TRIMMED_PATTERN_SOURCE/u.test(
        schemasSource,
      ) &&
      /workflowId: CoordinationIdInputSchema/u.test(schemasSource) &&
      /runId: Type\.Optional\(CoordinationIdInputSchema\)/u.test(schemasSource),
  },
  {
    id: "state-contract-authority-output",
    message: "state contract output must include additive authorityRepoRoot field",
    pass: /authorityRepoRoot: Type\.Optional\(Type\.String\(\{ minLength: 1 \}\)\)/u.test(stateContractSource),
  },
  {
    id: "runtime-router-policy-plumbing",
    message: "service/plugin/app seams must normalize IDs and return authorityRepoRoot without a special HQ router seam",
    pass:
      /function parseCoordinationId\(value: unknown\): string \| null/u.test(inputsSource) &&
      /return normalizeCoordinationId\(value\);/u.test(inputsSource) &&
      /getRepoStateWithAuthority\(context\.scope\.repoRoot\)/u.test(stateRouterSource) &&
      manifestSource.includes("registerCoordinationApiPlugin") &&
      manifestSource.includes("registerStateApiPlugin") &&
      !manifestSource.includes("createHqRuntimeRouter"),
  },
  {
    id: "f2-drift-tests",
    message: "hq app drift suites must assert F2 ID policy + additive authority metadata",
    pass:
      /keeps F2 ID input policy aligned with runtime normalization rules/u.test(hqDriftTestSource) &&
      /authorityRepoRoot/u.test(hqDriftTestSource) &&
      /workflow capability paths/u.test(triggerDriftTestSource),
  },
];

const failedChecks = checks.filter((check) => !check.pass);
assertCondition(
  failedChecks.length === 0,
  `phase-f f2 contract drift detected: ${failedChecks.map((check) => `${check.id}: ${check.message}`).join("; ")}`,
);

console.log("phase-f f2 interface policy contract verified");
