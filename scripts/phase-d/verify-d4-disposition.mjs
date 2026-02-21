#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";
import { assertCondition, mustExist } from "./_verify-utils.mjs";

const PASS_ROOT = "docs/projects/orpc-ingest-workflows-spec/_phase-d-runtime-execution-pass-01-2026-02-21";
const DEDUPE_RESULT_PATH = `${PASS_ROOT}/D4_DEDUPE_SCAN_RESULT.json`;
const FINISHED_HOOK_RESULT_PATH = `${PASS_ROOT}/D4_FINISHED_HOOK_SCAN_RESULT.json`;
const DISPOSITION_PATH = `${PASS_ROOT}/D4_DISPOSITION.md`;
const TRIGGER_EVIDENCE_PATH = `${PASS_ROOT}/D4_TRIGGER_EVIDENCE.md`;
const AGENT3_SCRATCHPAD_PATH = `${PASS_ROOT}/AGENT_3_SCRATCHPAD.md`;

await Promise.all([mustExist(DEDUPE_RESULT_PATH), mustExist(FINISHED_HOOK_RESULT_PATH), mustExist(DISPOSITION_PATH), mustExist(AGENT3_SCRATCHPAD_PATH)]);

const [dedupeRaw, finishedHookRaw, dispositionSource, agent3Scratchpad] = await Promise.all([
  fs.readFile(path.join(process.cwd(), DEDUPE_RESULT_PATH), "utf8"),
  fs.readFile(path.join(process.cwd(), FINISHED_HOOK_RESULT_PATH), "utf8"),
  fs.readFile(path.join(process.cwd(), DISPOSITION_PATH), "utf8"),
  fs.readFile(path.join(process.cwd(), AGENT3_SCRATCHPAD_PATH), "utf8"),
]);

const dedupeResult = JSON.parse(dedupeRaw);
const finishedHookResult = JSON.parse(finishedHookRaw);

const d3FailureLines = agent3Scratchpad
  .split(/\r?\n/u)
  .filter((line) => /phase-d:d3:(quick|full)/.test(line) && /failed|error/i.test(line));
const d3SuccessLines = agent3Scratchpad
  .split(/\r?\n/u)
  .filter((line) => /phase-d:d3:(quick|full)/.test(line) && /Validation passed/i.test(line));

const d3RecurrenceTriggered = d3FailureLines.length >= 2;
const anyTriggered = Boolean(dedupeResult.triggered) || Boolean(finishedHookResult.triggered) || d3RecurrenceTriggered;
const expectedState = anyTriggered ? "triggered" : "deferred";

const hasTriggeredState = /state:\s*triggered/u.test(dispositionSource);
const hasDeferredState = /state:\s*deferred/u.test(dispositionSource);
assertCondition(hasTriggeredState !== hasDeferredState, "D4_DISPOSITION.md must contain exactly one state: triggered or deferred");
const declaredState = hasTriggeredState ? "triggered" : "deferred";
assertCondition(
  declaredState === expectedState,
  `D4_DISPOSITION.md state mismatch: expected ${expectedState} from scan evidence, found ${declaredState}`,
);

assertCondition(
  /##\s*Trigger Matrix Summary/u.test(dispositionSource),
  "D4_DISPOSITION.md must include a Trigger Matrix Summary section",
);
assertCondition(
  /##\s*Carry-Forward Watchpoints/u.test(dispositionSource),
  "D4_DISPOSITION.md must include Carry-Forward Watchpoints section",
);
assertCondition(
  /phase-d:gate:d4-dedupe-scan/u.test(dispositionSource) &&
    /phase-d:gate:d4-finished-hook-scan/u.test(dispositionSource),
  "D4_DISPOSITION.md must reference both D4 scan gates",
);
assertCondition(
  /phase-d:gate:d3-ingress-middleware-structural-contract/u.test(dispositionSource),
  "D4_DISPOSITION.md must reference D3 recurrence criterion",
);

if (declaredState === "triggered") {
  await mustExist(TRIGGER_EVIDENCE_PATH);
  const triggerEvidenceSource = await fs.readFile(path.join(process.cwd(), TRIGGER_EVIDENCE_PATH), "utf8");
  assertCondition(triggerEvidenceSource.trim().length > 0, "D4_TRIGGER_EVIDENCE.md must not be empty when state is triggered");
}

console.log("phase-d d4 disposition verified");
console.log(
  `state=${declaredState}; dedupeTriggered=${Boolean(dedupeResult.triggered)}; finishedHookTriggered=${Boolean(
    finishedHookResult.triggered,
  )}; d3RecurrenceTriggered=${d3RecurrenceTriggered}; d3SuccessEvidence=${d3SuccessLines.length}; d3FailureEvidence=${d3FailureLines.length}`,
);
