#!/usr/bin/env bun
import { pathExists, writeJsonIfChanged } from "./_verify-utils.mjs";

const PASS_ROOT = "docs/projects/orpc-ingest-workflows-spec/_phase-d-runtime-execution-pass-01-2026-02-21";
const RESULT_PATH = `${PASS_ROOT}/D4_FINISHED_HOOK_SCAN_RESULT.json`;

const archivedPaths = [
  "services/coordination",
  "plugins/workflows/coordination",
];

const archivedPathStates = await Promise.all(
  archivedPaths.map(async (relPath) => ({
    relPath,
    exists: await pathExists(relPath),
  })),
);

const checks = [
  {
    id: "archived-finished-hook-lane-removed",
    message: "archived coordination finished-hook sources must stay out of the live tree",
    pass: archivedPathStates.every((entry) => entry.exists === false),
  },
];

const failedChecks = checks.filter((check) => !check.pass);
const triggered = failedChecks.length > 0;

const result = {
  criterion: "d4-finished-hook-scan",
  triggerRule: "archived finished-hook coordination lane must not reappear in the live tree",
  triggered,
  summary: triggered
    ? "Trigger criterion met: archived coordination finished-hook surfaces reappeared."
    : "Archived coordination finished-hook surfaces remain absent from the live tree.",
  checks,
  failedCheckIds: failedChecks.map((check) => check.id),
  archivedPathStates,
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
