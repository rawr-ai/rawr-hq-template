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

const expectedSites = [
  "apps/cli/src/lib/journal-context.ts::@rawr/hq/journal",
  "apps/cli/src/lib/workspace-plugins.ts::@rawr/hq/workspace",
  "plugins/cli/plugins/src/commands/plugins/converge.ts::@rawr/hq/lifecycle",
  "plugins/cli/plugins/src/commands/plugins/improve.ts::@rawr/hq/lifecycle",
  "plugins/cli/plugins/src/commands/plugins/sweep.ts::@rawr/hq/lifecycle",
  "plugins/cli/plugins/src/lib/install-state.ts::@rawr/hq/install",
  "plugins/cli/plugins/src/lib/workspace-plugins.ts::@rawr/hq/workspace",
];

const actualSites = await collectImportSites(["@rawr/hq"]);
assertExactSet(actualSites, expectedSites, "@rawr/hq facade import surface");

console.log("legacy @rawr/hq import surface remains frozen.");
