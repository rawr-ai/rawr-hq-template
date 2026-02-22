#!/usr/bin/env bun
import fs from "node:fs/promises";
import path from "node:path";
import {
  assertCondition,
  assertScriptEquals,
  mustExist,
  parseCliMode,
  readFile,
  readPackageScripts,
} from "./_verify-utils.mjs";

const PASS_ROOT = "docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21";
const F4_TRIGGER_SCAN_RESULT_PATH = `${PASS_ROOT}/F4_TRIGGER_SCAN_RESULT.json`;
const F4_DISPOSITION_PATH = `${PASS_ROOT}/F4_DISPOSITION.md`;
const F4_TRIGGER_EVIDENCE_PATH = `${PASS_ROOT}/F4_TRIGGER_EVIDENCE.md`;

const F5_REVIEW_DISPOSITION_PATH = `${PASS_ROOT}/F5_REVIEW_DISPOSITION.md`;
const F5A_STRUCTURAL_DISPOSITION_PATH = `${PASS_ROOT}/F5A_STRUCTURAL_DISPOSITION.md`;
const F6_CLEANUP_MANIFEST_PATH = `${PASS_ROOT}/F6_CLEANUP_MANIFEST.md`;
const PHASE_F_EXECUTION_REPORT_PATH = `${PASS_ROOT}/PHASE_F_EXECUTION_REPORT.md`;
const FINAL_PHASE_F_HANDOFF_PATH = `${PASS_ROOT}/FINAL_PHASE_F_HANDOFF.md`;

const mode = parseCliMode("f3-evidence");

await Promise.all([
  mustExist("scripts/phase-f/_verify-utils.mjs"),
  mustExist("scripts/phase-f/verify-f1-runtime-lifecycle-contract.mjs"),
  mustExist("scripts/phase-f/verify-f2-interface-policy-contract.mjs"),
  mustExist("scripts/phase-f/verify-f3-evidence-integrity.mjs"),
  mustExist("scripts/phase-f/verify-f4-trigger-scan.mjs"),
  mustExist("scripts/phase-f/verify-f4-disposition.mjs"),
]);

const scripts = await readPackageScripts();

assertScriptEquals(scripts, "phase-f:gate:drift-core", "bun run phase-e:gate:drift-core");
assertScriptEquals(
  scripts,
  "phase-f:gate:f3-evidence-integrity",
  "bun scripts/phase-f/verify-f3-evidence-integrity.mjs",
);
assertScriptEquals(
  scripts,
  "phase-f:f3:quick",
  "bun run phase-f:f2:quick && bun run phase-f:gate:f3-evidence-integrity",
);
assertScriptEquals(
  scripts,
  "phase-f:f3:full",
  "bun run phase-f:f3:quick && bun run phase-a:gate:harness-matrix",
);
assertScriptEquals(
  scripts,
  "phase-f:gate:f4-assess",
  "bun scripts/phase-f/verify-f4-trigger-scan.mjs",
);
assertScriptEquals(
  scripts,
  "phase-f:gate:f4-disposition",
  "bun scripts/phase-f/verify-f4-disposition.mjs",
);
assertScriptEquals(
  scripts,
  "phase-f:gate:f5-review-closure",
  "bun scripts/phase-f/verify-f3-evidence-integrity.mjs --mode=f5-review-closure",
);
assertScriptEquals(
  scripts,
  "phase-f:gate:f5a-structural-closure",
  "bun scripts/phase-f/verify-f3-evidence-integrity.mjs --mode=f5a-structural-closure",
);
assertScriptEquals(
  scripts,
  "phase-f:gate:f6-cleanup-manifest",
  "bun scripts/phase-f/verify-f3-evidence-integrity.mjs --mode=f6-cleanup-manifest",
);
assertScriptEquals(
  scripts,
  "phase-f:gate:f6-cleanup-integrity",
  "bun scripts/phase-f/verify-f3-evidence-integrity.mjs --mode=f6-cleanup-integrity",
);
assertScriptEquals(
  scripts,
  "phase-f:gate:f7-readiness",
  "bun scripts/phase-f/verify-f3-evidence-integrity.mjs --mode=f7-readiness",
);
assertScriptEquals(
  scripts,
  "phase-f:gates:full",
  "bun run phase-f:f1:full && bun run phase-f:f2:full && bun run phase-f:f3:full && bun run phase-f:gate:f4-assess && bun run phase-f:gate:f4-disposition",
);
assertScriptEquals(
  scripts,
  "phase-f:gates:closure",
  "bun run phase-f:gate:f5-review-closure && bun run phase-f:gate:f5a-structural-closure && bun run phase-f:gate:f6-cleanup-manifest && bun run phase-f:gate:f6-cleanup-integrity && bun run phase-f:gate:f7-readiness",
);
assertScriptEquals(
  scripts,
  "phase-f:gates:exit",
  "bun run phase-f:gates:full && bun run phase-f:gates:closure && bun run phase-a:gates:exit",
);

const phaseFScriptCommands = Object.entries(scripts)
  .filter(([name]) => name.startsWith("phase-f:"))
  .map(([, command]) => String(command))
  .join("\n");

assertCondition(
  !/AGENT_[0-9]+_PLAN_VERBATIM|AGENT_[0-9]+_SCRATCHPAD|ORCHESTRATOR_SCRATCHPAD/u.test(phaseFScriptCommands),
  "phase-f script commands must not depend on ephemeral scratch artifacts",
);
assertCondition(
  !/_phase-f-planning-pass|_phase-f-runtime-execution-pass-[^\n]*AGENT_[0-9]+/u.test(phaseFScriptCommands),
  "phase-f script commands must not depend on planning-pass or agent scratch artifacts",
);

if (mode === "f5-review-closure") {
  await mustExist(F5_REVIEW_DISPOSITION_PATH);
  const reviewDispositionSource = await readFile(F5_REVIEW_DISPOSITION_PATH);
  assertCondition(
    /disposition\s*:\s*(approve|defer|reject)/u.test(reviewDispositionSource),
    "F5_REVIEW_DISPOSITION.md must declare explicit review disposition",
  );
  console.log("phase-f f5 review closure verified");
  process.exit(0);
}

if (mode === "f5a-structural-closure") {
  await mustExist(F5A_STRUCTURAL_DISPOSITION_PATH);
  const structuralDispositionSource = await readFile(F5A_STRUCTURAL_DISPOSITION_PATH);
  assertCondition(
    /disposition\s*:\s*(approve|defer|reject)/u.test(structuralDispositionSource),
    "F5A_STRUCTURAL_DISPOSITION.md must declare explicit structural disposition",
  );
  console.log("phase-f f5a structural closure verified");
  process.exit(0);
}

if (mode === "f6-cleanup-manifest") {
  await mustExist(F6_CLEANUP_MANIFEST_PATH);
  const cleanupManifestSource = await readFile(F6_CLEANUP_MANIFEST_PATH);
  assertCondition(/\|\s*Path\s*\|\s*Action\s*\|/u.test(cleanupManifestSource), "F6_CLEANUP_MANIFEST.md must include a path/action inventory table");
  console.log("phase-f f6 cleanup manifest verified");
  process.exit(0);
}

if (mode === "f6-cleanup-integrity") {
  await Promise.all([mustExist(F6_CLEANUP_MANIFEST_PATH), mustExist(F4_TRIGGER_SCAN_RESULT_PATH), mustExist(F4_DISPOSITION_PATH)]);

  const [cleanupManifestSource, dispositionSource] = await Promise.all([
    readFile(F6_CLEANUP_MANIFEST_PATH),
    readFile(F4_DISPOSITION_PATH),
  ]);

  assertCondition(
    cleanupManifestSource.includes("F4_DISPOSITION.md") && cleanupManifestSource.includes("F4_TRIGGER_SCAN_RESULT.json"),
    "F6_CLEANUP_MANIFEST.md must retain F4 disposition + scan artifacts as closure-critical",
  );

  const dispositionState = /state:\s*triggered/u.test(dispositionSource)
    ? "triggered"
    : /state:\s*deferred/u.test(dispositionSource)
      ? "deferred"
      : null;
  assertCondition(dispositionState !== null, "F4_DISPOSITION.md must declare explicit state before cleanup integrity verification");

  if (dispositionState === "triggered") {
    await mustExist(F4_TRIGGER_EVIDENCE_PATH);
  }

  console.log("phase-f f6 cleanup integrity verified");
  process.exit(0);
}

if (mode === "f7-readiness") {
  await Promise.all([mustExist(PHASE_F_EXECUTION_REPORT_PATH), mustExist(FINAL_PHASE_F_HANDOFF_PATH)]);

  const [executionReportSource, finalHandoffSource, passEntries] = await Promise.all([
    readFile(PHASE_F_EXECUTION_REPORT_PATH),
    readFile(FINAL_PHASE_F_HANDOFF_PATH),
    fs.readdir(path.join(process.cwd(), PASS_ROOT)),
  ]);

  const readinessFiles = passEntries.filter((entry) => /^F7_.*READINESS.*\.md$/u.test(entry));
  assertCondition(readinessFiles.length > 0, "F7 readiness gate requires at least one F7 readiness artifact file");

  assertCondition(
    /F4|triggered|deferred/u.test(executionReportSource) && /F4|triggered|deferred/u.test(finalHandoffSource),
    "Phase F execution report and final handoff must include explicit F4 disposition posture",
  );

  console.log("phase-f f7 readiness verified");
  process.exit(0);
}

assertCondition(mode === "f3-evidence", `unknown mode: ${mode}`);
console.log("phase-f f3 evidence integrity verified");
