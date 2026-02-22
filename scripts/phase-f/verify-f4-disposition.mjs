#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";
import { assertCondition, mustExist, readFile } from "./_verify-utils.mjs";

const PASS_ROOT = "docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21";
const F4_TRIGGER_SCAN_RESULT_PATH = `${PASS_ROOT}/F4_TRIGGER_SCAN_RESULT.json`;
const F4_DISPOSITION_PATH = `${PASS_ROOT}/F4_DISPOSITION.md`;
const F4_TRIGGER_EVIDENCE_PATH = `${PASS_ROOT}/F4_TRIGGER_EVIDENCE.md`;

await Promise.all([mustExist(F4_TRIGGER_SCAN_RESULT_PATH), mustExist(F4_DISPOSITION_PATH)]);

const [scanResultRaw, dispositionSource] = await Promise.all([
  readFile(F4_TRIGGER_SCAN_RESULT_PATH),
  readFile(F4_DISPOSITION_PATH),
]);

const scanResult = JSON.parse(scanResultRaw);

const hasTriggeredState = /state:\s*triggered/u.test(dispositionSource);
const hasDeferredState = /state:\s*deferred/u.test(dispositionSource);
assertCondition(
  hasTriggeredState !== hasDeferredState,
  "F4_DISPOSITION.md must declare exactly one explicit state: triggered or deferred",
);
const declaredState = hasTriggeredState ? "triggered" : "deferred";

assertCondition(/D-004/u.test(dispositionSource), "F4_DISPOSITION.md must reference D-004 decision scope");
assertCondition(
  /##\s*Trigger Matrix Summary/u.test(dispositionSource),
  "F4_DISPOSITION.md must include a Trigger Matrix Summary section",
);
assertCondition(
  /##\s*Carry-Forward Watchpoints/u.test(dispositionSource),
  "F4_DISPOSITION.md must include a Carry-Forward Watchpoints section",
);
assertCondition(
  /phase-f:gate:f4-assess/u.test(dispositionSource) && /F4_TRIGGER_SCAN_RESULT\.json/u.test(dispositionSource),
  "F4_DISPOSITION.md must reference phase-f:gate:f4-assess and F4_TRIGGER_SCAN_RESULT.json",
);

const counters = {
  capabilitySurfaceCount: Number(scanResult.capabilitySurfaceCount ?? 0),
  duplicatedBoilerplateClusterCount: Number(scanResult.duplicatedBoilerplateClusterCount ?? 0),
  correctnessSignalCount: Number(scanResult.correctnessSignalCount ?? 0),
};
const thresholds = {
  capabilitySurfaceCount: Number(scanResult?.thresholds?.capabilitySurfaceCount ?? 3),
  duplicatedBoilerplateClusterCount: Number(scanResult?.thresholds?.duplicatedBoilerplateClusterCount ?? 2),
  correctnessSignalCount: Number(scanResult?.thresholds?.correctnessSignalCount ?? 1),
};

const countersMeetTriggerThreshold =
  counters.capabilitySurfaceCount >= thresholds.capabilitySurfaceCount &&
  counters.duplicatedBoilerplateClusterCount >= thresholds.duplicatedBoilerplateClusterCount &&
  counters.correctnessSignalCount >= thresholds.correctnessSignalCount;

if (declaredState === "triggered") {
  assertCondition(
    countersMeetTriggerThreshold,
    "F4_DISPOSITION.md cannot declare triggered unless F4 trigger counters meet thresholds",
  );

  await mustExist(F4_TRIGGER_EVIDENCE_PATH);
  const triggerEvidenceSource = await readFile(F4_TRIGGER_EVIDENCE_PATH);
  assertCondition(
    triggerEvidenceSource.trim().length > 0,
    "F4_TRIGGER_EVIDENCE.md must not be empty when F4 disposition is triggered",
  );
  assertCondition(
    /D-004|capabilitySurfaceCount|duplicatedBoilerplateClusterCount|correctnessSignalCount/u.test(triggerEvidenceSource),
    "F4_TRIGGER_EVIDENCE.md must map trigger evidence to D-004 counters",
  );
} else {
  let triggerEvidenceExists = false;
  try {
    const triggerEvidenceStat = await fs.stat(path.join(process.cwd(), F4_TRIGGER_EVIDENCE_PATH));
    triggerEvidenceExists = triggerEvidenceStat.isFile();
  } catch {
    triggerEvidenceExists = false;
  }
  assertCondition(!triggerEvidenceExists, "F4_TRIGGER_EVIDENCE.md is only allowed for triggered disposition state");
}

console.log("phase-f f4 disposition verified");
console.log(
  `state=${declaredState}; capabilitySurfaceCount=${counters.capabilitySurfaceCount}; duplicatedBoilerplateClusterCount=${counters.duplicatedBoilerplateClusterCount}; correctnessSignalCount=${counters.correctnessSignalCount}`,
);
