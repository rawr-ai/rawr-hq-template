#!/usr/bin/env bun
import { mustExist, readFile, writeJsonIfChanged } from "./_verify-utils.mjs";

const PASS_ROOT = "docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21";
const RESULT_PATH = `${PASS_ROOT}/F4_TRIGGER_SCAN_RESULT.json`;

const THRESHOLDS = {
  capabilitySurfaceCount: 3,
  duplicatedBoilerplateClusterCount: 2,
  correctnessSignalCount: 1,
};

await Promise.all([
  mustExist("rawr.hq.ts"),
  mustExist("packages/core/src/orpc/runtime-router.ts"),
  mustExist("packages/core/test/orpc-contract-drift.test.ts"),
  mustExist("packages/core/test/workflow-trigger-contract-drift.test.ts"),
]);

const [manifestSource, runtimeRouterSource, hqDriftTestSource, triggerDriftTestSource] = await Promise.all([
  readFile("rawr.hq.ts"),
  readFile("packages/core/src/orpc/runtime-router.ts"),
  readFile("packages/core/test/orpc-contract-drift.test.ts"),
  readFile("packages/core/test/workflow-trigger-contract-drift.test.ts"),
]);

const capabilitiesBlockMatch = manifestSource.match(/workflows:\s*\{[\s\S]*?capabilities:\s*\{([\s\S]*?)\}\s*,\s*triggerRouter:/u);
const capabilitiesBlock = capabilitiesBlockMatch?.[1] ?? "";
const capabilitySurfaceIds = [...capabilitiesBlock.matchAll(/^\s*([A-Za-z0-9_-]+)\s*:\s*\{/gmu)].map((match) => match[1]);
const uniqueCapabilitySurfaceIds = [...new Set(capabilitySurfaceIds)].sort();
const capabilitySurfaceCount = uniqueCapabilitySurfaceIds.length;

const boilerplateSignals = [
  {
    id: "workflow-id-validation",
    pattern: /parseCoordinationId\(input\.workflowId\)/g,
  },
  {
    id: "workflow-not-found",
    pattern: /notFound\("WORKFLOW_NOT_FOUND"/g,
  },
  {
    id: "run-id-validation",
    pattern: /parseCoordinationId\(input\.runId\)/g,
  },
  {
    id: "invalid-id-errors",
    pattern: /badRequest\("INVALID_(WORKFLOW|RUN)_ID"/g,
  },
];

const repeatedBoilerplateSignals = boilerplateSignals
  .map((signal) => {
    const occurrences = (runtimeRouterSource.match(signal.pattern) ?? []).length;
    return { ...signal, occurrences };
  })
  .filter((signal) => signal.occurrences >= 2);

const duplicatedBoilerplateClusterCount = capabilitySurfaceCount >= 2 ? repeatedBoilerplateSignals.length : 0;

const correctnessSignalMatchers = [
  /hard-fails/u,
  /drift/u,
  /route-family/u,
  /reject/u,
];

const correctnessSignalHits = correctnessSignalMatchers.reduce((sum, matcher) => {
  const hqMatches = (hqDriftTestSource.match(new RegExp(matcher.source, "gu")) ?? []).length;
  const triggerMatches = (triggerDriftTestSource.match(new RegExp(matcher.source, "gu")) ?? []).length;
  return sum + hqMatches + triggerMatches;
}, 0);

const correctnessSignalCount =
  capabilitySurfaceCount >= THRESHOLDS.capabilitySurfaceCount &&
  duplicatedBoilerplateClusterCount >= THRESHOLDS.duplicatedBoilerplateClusterCount &&
  correctnessSignalHits > 0
    ? 1
    : 0;

const triggered =
  capabilitySurfaceCount >= THRESHOLDS.capabilitySurfaceCount &&
  duplicatedBoilerplateClusterCount >= THRESHOLDS.duplicatedBoilerplateClusterCount &&
  correctnessSignalCount >= THRESHOLDS.correctnessSignalCount;

const result = {
  criterion: "f4-d004-trigger-scan",
  triggerRule:
    "capabilitySurfaceCount >= 3 AND duplicatedBoilerplateClusterCount >= 2 AND correctnessSignalCount >= 1",
  triggered,
  thresholds: THRESHOLDS,
  capabilitySurfaceIds: uniqueCapabilitySurfaceIds,
  capabilitySurfaceCount,
  duplicatedBoilerplateClusterCount,
  duplicatedBoilerplateClusters: repeatedBoilerplateSignals.map((signal) => ({
    id: signal.id,
    occurrences: signal.occurrences,
  })),
  correctnessSignalCount,
  correctnessSignalHits,
  summary: triggered
    ? "F4 trigger criteria met by structural counters; D-004 closure can proceed with explicit invariant review evidence."
    : "F4 trigger criteria not met; disposition should be deferred with carry-forward watchpoints.",
};

const writeResult = await writeJsonIfChanged(RESULT_PATH, result);

if (triggered) {
  console.log("phase-f f4 trigger scan: TRIGGERED");
} else {
  console.log("phase-f f4 trigger scan: deferred posture");
}
console.log(
  `wrote ${RESULT_PATH}${writeResult.changed ? "" : " (unchanged)"}; capabilitySurfaceCount=${capabilitySurfaceCount}; duplicatedBoilerplateClusterCount=${duplicatedBoilerplateClusterCount}; correctnessSignalCount=${correctnessSignalCount}`,
);
