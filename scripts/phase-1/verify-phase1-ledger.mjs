#!/usr/bin/env bun
import {
  assertCondition,
  listDirectChildDirs,
  readPhase1Ledger,
} from "./_verify-utils.mjs";

const ledger = await readPhase1Ledger();
const classified = new Set([
  ...ledger.live,
  ...ledger.archived,
  ...ledger.parked,
  ...Object.keys(ledger.reclassified),
]);

const requiredApps = ["apps/cli", "apps/hq", "apps/server", "apps/web"];
const requiredServices = [
  "services/agent-config-sync",
  "services/coordination",
  "services/example-todo",
  "services/state",
  "services/support-example",
];
const requiredPackages = [
  "packages/agent-config-sync-host",
  "packages/control-plane",
  "packages/hq",
  "packages/journal",
  "packages/security",
];
const requiredParked = ["plugins/agents/hq", "plugins/server/api/example-todo", "plugins/server/api/state"];
const requiredArchived = [
  "services/coordination",
  "plugins/api/coordination",
  "plugins/workflows/coordination",
  "services/support-example",
  "plugins/workflows/support-example",
];
const requiredReclassified = {
  "services/state": "services/hq-ops/repo-state",
  "packages/control-plane": "services/hq-ops/config",
  "packages/journal": "services/hq-ops/journal",
  "packages/security": "services/hq-ops/security",
};

for (const item of requiredApps) {
  assertCondition(ledger.live.includes(item), `live lane must include ${item}`);
}

for (const item of requiredServices) {
  assertCondition(classified.has(item), `ledger must classify ${item}`);
}

for (const item of requiredPackages) {
  assertCondition(classified.has(item), `ledger must classify ${item}`);
}

for (const item of requiredParked) {
  assertCondition(ledger.parked.includes(item), `parked lane must include ${item}`);
}

for (const item of requiredArchived) {
  assertCondition(ledger.archived.includes(item), `archived lane must include ${item}`);
}

for (const [source, target] of Object.entries(requiredReclassified)) {
  assertCondition(
    ledger.reclassified[source] === target,
    `reclassified target for ${source} must be ${target}`,
  );
}

assertCondition(
  typeof ledger.reclassified["packages/hq"] === "string" &&
    ledger.reclassified["packages/hq"].includes("packages/plugin-workspace"),
  "reclassified target for packages/hq must point at packages/plugin-workspace and purpose-named tooling boundaries",
);

const prohibitedJoined = ledger.prohibited.join("\n");
for (const requiredPhrase of [
  "plugins/api/*",
  "plugins/workflows/*",
  "coordination",
  "support-example",
  "@rawr/hq",
  "deletions, rewires, compile fixes, and explicit unblockers",
]) {
  assertCondition(
    prohibitedJoined.includes(requiredPhrase),
    `prohibited directions must include "${requiredPhrase}"`,
  );
}

for (const command of [
  "bun scripts/phase-1/verify-phase1-ledger.mjs",
  "bun scripts/phase-1/verify-no-live-coordination.mjs",
  "bun scripts/phase-1/verify-no-live-support-example.mjs",
  "bun scripts/phase-1/verify-agent-marketplace-lane-frozen.mjs",
  "bun scripts/phase-1/verify-hq-ops-service-shape.mjs",
  "bun scripts/phase-1/verify-no-old-operational-packages.mjs",
  "bun scripts/phase-1/verify-no-legacy-hq-imports.mjs",
  "bun scripts/phase-1/verify-canonical-plugin-topology.mjs",
  "bun scripts/phase-1/verify-manifest-purity.mjs",
  "bun scripts/phase-1/verify-entrypoint-thinness.mjs",
  "bun scripts/phase-1/verify-no-legacy-composition-authority.mjs",
  "bun scripts/phase-1/verify-parked-lane-frozen.mjs",
  "bun run phase-1:gates:baseline",
]) {
  assertCondition(ledger.verification[command], `verification map must include ${command}`);
}

const actualApps = await listDirectChildDirs("apps");
const actualPluginCli = await listDirectChildDirs("plugins/cli");
const actualPluginWeb = await listDirectChildDirs("plugins/web");
const actualPluginServerApi = await listDirectChildDirs("plugins/server/api");
const actualPluginAsyncWorkflows = await listDirectChildDirs("plugins/async/workflows");
const actualPluginAsyncSchedules = await listDirectChildDirs("plugins/async/schedules");

for (const relPath of [
  ...actualApps,
  ...actualPluginCli,
  ...actualPluginWeb,
  ...actualPluginServerApi,
  ...actualPluginAsyncWorkflows,
  ...actualPluginAsyncSchedules,
]) {
  assertCondition(classified.has(relPath), `ledger must classify inventory surface ${relPath}`);
}

console.log("phase-1 ledger verification passed.");
