#!/usr/bin/env bun
import path from "node:path";
import { assertCondition, assertScriptEquals, mustExist, parseCliMode, readFile, readPackageScripts } from "./_verify-utils.mjs";

const PASS_ROOT = "docs/projects/orpc-ingest-workflows-spec/_phase-e-runtime-execution-pass-01-2026-02-21";
const E4_DISPOSITION_PATH = `${PASS_ROOT}/E4_DISPOSITION.md`;
const E4_TRIGGER_EVIDENCE_PATH = `${PASS_ROOT}/E4_TRIGGER_EVIDENCE.md`;

const mode = parseCliMode("e3-evidence");

await Promise.all([
  mustExist("scripts/phase-e/_verify-utils.mjs"),
  mustExist("scripts/phase-e/verify-e1-dedupe-policy.mjs"),
  mustExist("scripts/phase-e/verify-e2-finished-hook-policy.mjs"),
  mustExist("scripts/phase-e/verify-e3-evidence-integrity.mjs"),
]);

const scripts = await readPackageScripts();

assertScriptEquals(scripts, "phase-e:gate:e3-evidence-integrity", "bun scripts/phase-e/verify-e3-evidence-integrity.mjs");
assertScriptEquals(
  scripts,
  "phase-e:e3:quick",
  "bun run phase-e:e2:quick && bun run phase-e:gate:e3-evidence-integrity",
);
assertScriptEquals(
  scripts,
  "phase-e:e3:full",
  "bun run phase-e:e3:quick && bun run phase-a:gate:harness-matrix",
);
assertScriptEquals(
  scripts,
  "phase-e:gate:e4-disposition",
  "bun scripts/phase-e/verify-e3-evidence-integrity.mjs --mode=e4-disposition",
);
assertScriptEquals(
  scripts,
  "phase-e:gates:exit",
  "bun run phase-e:e3:full && bun run phase-e:gate:e4-disposition && bun run phase-a:gates:exit",
);

const phaseEScriptCommands = Object.entries(scripts)
  .filter(([name]) => name.startsWith("phase-e:"))
  .map(([, command]) => String(command))
  .join("\n");

assertCondition(
  !/AGENT_[0-9]+_PLAN_VERBATIM|AGENT_[0-9]+_SCRATCHPAD|ORCHESTRATOR_SCRATCHPAD/u.test(phaseEScriptCommands),
  "phase-e script commands must not depend on ephemeral scratch artifacts",
);
assertCondition(
  !/_phase-e-planning-pass/u.test(phaseEScriptCommands),
  "phase-e script commands must not depend on planning-pass artifacts",
);

if (mode === "e4-disposition") {
  await mustExist(E4_DISPOSITION_PATH);
  const dispositionSource = await readFile(E4_DISPOSITION_PATH);

  assertCondition(
    /D-009/u.test(dispositionSource) && /D-010/u.test(dispositionSource),
    "E4_DISPOSITION.md must include both D-009 and D-010",
  );
  assertCondition(
    /D-009:[^\n]*(locked|deferred)/u.test(dispositionSource),
    "E4_DISPOSITION.md must declare locked/deferred outcome for D-009",
  );
  assertCondition(
    /D-010:[^\n]*(locked|deferred)/u.test(dispositionSource),
    "E4_DISPOSITION.md must declare locked/deferred outcome for D-010",
  );

  const dispositionAbsolutePath = path.join(process.cwd(), E4_DISPOSITION_PATH);
  const mentionsTriggeredEvidence = /triggered|trigger[_-]evidence|E4_TRIGGER_EVIDENCE\.md/u.test(dispositionSource);
  if (mentionsTriggeredEvidence) {
    await mustExist(E4_TRIGGER_EVIDENCE_PATH);
  }

  console.log(`phase-e e4 disposition verified (${dispositionAbsolutePath})`);
} else {
  console.log("phase-e e3 evidence integrity verified");
}
