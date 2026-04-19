#!/usr/bin/env bun
import {
  assertCondition,
  assertExactSet,
  collectImportSites,
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
}

const expectedSites = [
  "apps/cli/src/commands/config/show.ts::@rawr/control-plane",
  "apps/cli/src/commands/config/validate.ts::@rawr/control-plane",
  "apps/cli/src/commands/journal/search.ts::@rawr/control-plane",
  "apps/cli/src/commands/journal/search.ts::@rawr/journal",
  "apps/cli/src/commands/journal/show.ts::@rawr/journal",
  "apps/cli/src/commands/journal/tail.ts::@rawr/journal",
  "apps/cli/src/commands/reflect.ts::@rawr/journal",
  "apps/cli/src/commands/workflow/demo-mfe.ts::@rawr/journal",
  "apps/cli/src/commands/workflow/forge-command.ts::@rawr/journal",
  "apps/cli/src/commands/workflow/harden.ts::@rawr/journal",
  "apps/cli/src/index.ts::@rawr/journal",
  "apps/cli/src/lib/coordination-api.ts::@rawr/control-plane",
  "apps/server/src/bootstrap.ts::@rawr/control-plane",
  "apps/server/src/bootstrap.ts::@rawr/state/repo-state",
  "apps/server/src/host-satisfiers.ts::@rawr/state",
  "apps/server/test/rawr.test.ts::@rawr/state/repo-state",
  "apps/server/test/storage-lock-route-guard.test.ts::@rawr/state/repo-state",
  "packages/agent-sync/src/lib/layered-config.ts::@rawr/control-plane",
  "packages/agent-sync/src/lib/targets.ts::@rawr/control-plane",
  "packages/hq/src/security/module.ts::@rawr/security",
  "plugins/api/state/src/context.ts::@rawr/state",
  "plugins/api/state/src/contract.ts::@rawr/state/service/contract",
  "plugins/cli/plugins/src/commands/plugins/sync/sources/add.ts::@rawr/control-plane",
  "plugins/cli/plugins/src/commands/plugins/sync/sources/list.ts::@rawr/control-plane",
  "plugins/cli/plugins/src/commands/plugins/sync/sources/remove.ts::@rawr/control-plane",
  "plugins/cli/plugins/src/commands/plugins/web/disable.ts::@rawr/state/repo-state",
  "plugins/cli/plugins/src/commands/plugins/web/enable.ts::@rawr/control-plane",
  "plugins/cli/plugins/src/commands/plugins/web/enable.ts::@rawr/state/repo-state",
  "plugins/cli/plugins/src/commands/plugins/web/enable/all.ts::@rawr/control-plane",
  "plugins/cli/plugins/src/commands/plugins/web/enable/all.ts::@rawr/state/repo-state",
  "plugins/cli/plugins/src/commands/plugins/web/status.ts::@rawr/state/repo-state",
  "plugins/cli/plugins/src/lib/security.ts::@rawr/security",
];

const actualSites = await collectImportSites([
  "@rawr/control-plane",
  "@rawr/journal",
  "@rawr/security",
  "@rawr/state",
]);

assertExactSet(actualSites, expectedSites, "old operational owner import surface");

console.log("old operational owner residual imports remain frozen.");
