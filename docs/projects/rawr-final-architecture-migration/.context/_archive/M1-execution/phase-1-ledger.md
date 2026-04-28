# Phase 1 Ledger

This ledger is the checked-in classifier for Milestone 1 of the final architecture migration. It records what is canonical and live, what is frozen in place, what is already treated as archived, and which current owners exist only as temporary residuals on the way to the canonical HQ lane.

Phase 1 is an authority-collapse plateau, not a substrate-building plateau. This ledger exists so the repo can enforce that distinction mechanically instead of relying on memory or convention.

## Live lane

These are the minimum concrete Phase 1 surfaces that remain live without being treated as parked or already reclassified. This ledger is intentionally narrow: it records the hardened M1 execution set, not the entire repo inventory.

```json
[
  "apps/cli",
  "apps/hq",
  "apps/server",
  "apps/web",
  "services/agent-config-sync",
  "services/example-todo",
  "services/hq-ops",
  "packages/core",
  "plugins/cli/chatgpt-corpus",
  "plugins/cli/hello",
  "plugins/cli/plugins",
  "plugins/cli/session-tools",
  "plugins/web/mfe-demo"
]
```

## Archived lane

These are Phase 1 false-future or dead-lane surfaces. They are classified as archived for the milestone and, once their archive cut lands, they must stay absent from the live tree rather than being normalized forward.

```json
[
  "services/coordination",
  "plugins/api/coordination",
  "plugins/workflows/coordination",
  "services/support-example",
  "plugins/workflows/support-example"
]
```

## Parked lane

These surfaces remain present for continuity during Phase 1, but they are frozen. Work here is limited to deletions, rewires, compile fixes, and explicit unblockers while later M1 slices replace or remove them.

```json
[
  "plugins/agents/hq",
  "plugins/server/api/example-todo",
  "plugins/server/api/state"
]
```

## Reclassified / target homes

These current owners are still present, but they are no longer treated as canonical truth. Their Phase 1 meaning is "move this authority into the recorded target home and then delete the residual owner."

```json
{
  "services/state": "services/hq-ops/repo-state",
  "packages/control-plane": "services/hq-ops/config",
  "packages/journal": "services/hq-ops/journal",
  "packages/security": "services/hq-ops/security",
  "packages/agent-sync": "services/agent-config-sync plus plugin/app-local concrete resource binding",
  "packages/hq": "services/hq-ops/plugin-catalog plus packages/core workspace-root bootstrap support"
}
```

## Prohibited directions

These are the Phase 1 rails that must not drift while the milestone is in flight.

```json
[
  "No new work lands under plugins/api/* during Phase 1.",
  "No new work lands under plugins/workflows/* during Phase 1.",
  "coordination stays archived and out of the live lane.",
  "support-example stays archived and out of the live lane.",
  "The plugins/agents/hq marketplace compatibility lane stays frozen in place during Phase 1.",
  "Live code must not import @rawr/hq/* from the live lane.",
  "Live code must not add new imports from the recorded old operational owners while their authority is being dissolved.",
  "Parked-lane edits are limited to deletions, rewires, compile fixes, and explicit unblockers."
]
```

## Verification map

These checks are the root-owned Phase 1 proof band introduced by `M1-U00`.

```json
{
  "bun scripts/phase-1/verify-phase1-ledger.mjs": "Validate the ledger shape, required classifications, and inventory alignment.",
  "bun scripts/phase-1/verify-no-live-coordination.mjs": "Keep coordination classified as archived only, absent from the live tree, and backed by archive lessons.",
  "bun scripts/phase-1/verify-no-live-support-example.mjs": "Keep support-example classified as archived only, absent from the live tree, and backed by archive lessons.",
  "bun scripts/phase-1/verify-agent-marketplace-lane-frozen.mjs": "Freeze the current plugins/agents topology and keep plugins/agents/hq parked in place.",
  "bun scripts/phase-1/verify-hq-ops-service-shape.mjs": "Keep HQ operational truth collapsed into the canonical services/hq-ops service shape.",
  "bun scripts/phase-1/verify-no-old-operational-packages.mjs": "Keep old operational owners from regaining live import authority while HQ Ops and purpose-named support boundaries absorb them.",
  "bun scripts/phase-1/verify-no-legacy-hq-imports.mjs": "Prove the legacy @rawr/hq facade imports are absent from the live lane after M1-U04.",
  "bun scripts/phase-1/verify-canonical-plugin-topology.mjs": "Prove the canonical role-first plugin roots are authoritative and the old live roots are gone.",
  "bun scripts/phase-1/verify-manifest-purity.mjs": "Keep the canonical HQ shell declaration-only and anchored at apps/hq/rawr.hq.ts.",
  "bun scripts/phase-1/verify-entrypoint-thinness.mjs": "Keep the HQ app entrypoints thin, app-owned, and bridged only through apps/hq/legacy-cutover.ts.",
  "bun scripts/phase-1/verify-no-legacy-composition-authority.mjs": "Prove legacy host-composition authority is quarantined behind the one sanctioned HQ bridge.",
  "bun scripts/phase-1/verify-parked-lane-frozen.mjs": "Prove the parked compatibility lanes remain present but frozen in place.",
  "bun run phase-1:gates:baseline": "Run the full root-owned Phase 1 guardrail band."
}
```
