#!/usr/bin/env bun
import {
  assertCondition,
  assertExactSet,
  collectImportSites,
  pathExists,
  readPhase1Ledger,
} from "./_verify-utils.mjs";

const ledger = await readPhase1Ledger();

for (const relPath of [
  "services/state",
  "packages/control-plane",
  "packages/journal",
  "packages/security",
]) {
  assertCondition(relPath in ledger.reclassified, `${relPath} must stay classified as reclassified`);
  assertCondition(!ledger.live.includes(relPath), `${relPath} must not appear in the live lane`);
  assertCondition(!ledger.parked.includes(relPath), `${relPath} must not appear in the parked lane`);
  assertCondition(!(await pathExists(relPath)), `${relPath} must not exist in the live tree`);
}

const actualSites = await collectImportSites([
  "@rawr/control-plane",
  "@rawr/journal",
  "@rawr/security",
  "@rawr/state",
]);

assertExactSet(actualSites, [], "old operational owner import surface");

console.log("old operational owner packages removed and imports eliminated.");
