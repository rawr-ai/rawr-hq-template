#!/usr/bin/env bun
import { assertCondition, listDirectChildDirs, readPhase1Ledger } from "./_verify-utils.mjs";

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
}

const actualSupportExampleRoots = [
  ...(await listDirectChildDirs("services")).filter((item) => item.endsWith("/support-example")),
  ...(await listDirectChildDirs("plugins/workflows")).filter((item) => item.endsWith("/support-example")),
].sort();

assertCondition(
  actualSupportExampleRoots.join("\n") === supportExampleRoots.sort().join("\n"),
  `support-example roots drifted.\nExpected:\n${supportExampleRoots.join("\n")}\n\nActual:\n${actualSupportExampleRoots.join("\n")}`,
);

console.log("support-example remains archived and out of the live lane.");
