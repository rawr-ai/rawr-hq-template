#!/usr/bin/env bun
import { assertCondition, listDirectChildDirs, readPhase1Ledger } from "./_verify-utils.mjs";

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
}

const actualCoordinationRoots = [
  ...(await listDirectChildDirs("services")).filter((item) => item.endsWith("/coordination")),
  ...(await listDirectChildDirs("plugins/api")).filter((item) => item.endsWith("/coordination")),
  ...(await listDirectChildDirs("plugins/workflows")).filter((item) => item.endsWith("/coordination")),
].sort();

assertCondition(
  actualCoordinationRoots.join("\n") === coordinationRoots.sort().join("\n"),
  `coordination roots drifted.\nExpected:\n${coordinationRoots.join("\n")}\n\nActual:\n${actualCoordinationRoots.join("\n")}`,
);

console.log("coordination remains archived and out of the live lane.");
