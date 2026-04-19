#!/usr/bin/env bun
import { assertCondition, pathExists, readFile, readPhase1Ledger } from "./_verify-utils.mjs";

const ledger = await readPhase1Ledger();
const supportExampleRoots = [
  "services/support-example",
  "plugins/workflows/support-example",
];

for (const relPath of supportExampleRoots) {
  assertCondition(ledger.archived.includes(relPath), `${relPath} must stay classified as archived`);
  assertCondition(!ledger.live.includes(relPath), `${relPath} must not appear in the live lane`);
  assertCondition(!ledger.parked.includes(relPath), `${relPath} must not appear in the parked lane`);
  assertCondition(!(relPath in ledger.reclassified), `${relPath} must not appear in reclassified targets`);
  assertCondition(!(await pathExists(relPath)), `${relPath} must not exist in the live tree`);
}

const lessonsPath = "docs/archive/support-example/lessons.md";
assertCondition(await pathExists(lessonsPath), `${lessonsPath} must exist`);

const lessons = await readFile(lessonsPath);
assertCondition(lessons.includes("queued -> running -> completed|failed"), "support-example lessons must preserve the lifecycle fixture");
assertCondition(lessons.includes("runId, workItemId, repoRoot, queueId, requestedBy, dryRun, requestId, correlationId"), "support-example lessons must preserve the representative payload");
assertCondition(lessons.includes("async acceptance language"), "support-example lessons must preserve the translated proof intent");

console.log("support-example remains archived, removed from the live tree, and preserved only as archive lessons.");
