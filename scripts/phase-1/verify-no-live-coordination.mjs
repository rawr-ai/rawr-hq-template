#!/usr/bin/env bun
import { assertCondition, pathExists, readFile, readPhase1Ledger } from "./_verify-utils.mjs";

const ledger = await readPhase1Ledger();
const coordinationRoots = [
  "services/coordination",
  "plugins/api/coordination",
  "plugins/workflows/coordination",
];

for (const relPath of coordinationRoots) {
  assertCondition(ledger.archived.includes(relPath), `${relPath} must stay classified as archived`);
  assertCondition(!ledger.live.includes(relPath), `${relPath} must not appear in the live lane`);
  assertCondition(!ledger.parked.includes(relPath), `${relPath} must not appear in the parked lane`);
  assertCondition(!(relPath in ledger.reclassified), `${relPath} must not appear in reclassified targets`);
  assertCondition(!(await pathExists(relPath)), `${relPath} must not exist in the live tree`);
}

const lessonsPath = "docs/archive/coordination/lessons.md";
assertCondition(await pathExists(lessonsPath), `${lessonsPath} must exist`);

const lessons = await readFile(lessonsPath);
assertCondition(lessons.includes("service truth -> plugin projection -> app composition -> host materialization"), "coordination lessons must preserve the wiring pattern");
assertCondition(lessons.includes("oRPC"), "coordination lessons must preserve the transport boundary lesson");
assertCondition(lessons.includes("What To Leave Behind"), "coordination lessons must record what stays archived");

console.log("coordination remains archived, removed from the live tree, and preserved only as archive lessons.");
