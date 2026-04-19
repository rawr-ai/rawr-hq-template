#!/usr/bin/env bun
import {
  assertCondition,
  assertExactSet,
  collectImportSites,
  readPhase1Ledger,
} from "./_verify-utils.mjs";

const ledger = await readPhase1Ledger();

assertCondition("packages/hq" in ledger.reclassified, "packages/hq must stay classified as reclassified");
assertCondition(!ledger.live.includes("packages/hq"), "packages/hq must not appear in the live lane");
assertCondition(!ledger.parked.includes("packages/hq"), "packages/hq must not appear in the parked lane");

const actualSites = await collectImportSites(["@rawr/hq"]);
assertExactSet(actualSites, [], "@rawr/hq facade import surface");

console.log("legacy @rawr/hq facade imports are fully removed.");
