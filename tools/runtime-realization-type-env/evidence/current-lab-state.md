# Current Lab State

This is the current-state pointer for the contained runtime-realization lab. It
answers "where are we right now?" without becoming a tracker, backlog, or proof
ledger.

## How To Read This

| Need | Read |
| --- | --- |
| Current program state | `Current State` |
| Current manifest experiment | `Current Manifest Experiment` |
| What this state depends on | `Related Manifest Entries` |
| When this file changes | `Update Rule` |

The proof ledger remains `proof-manifest.json`. This file mirrors
`proof-manifest.currentExperiment` for human navigation.

## At A Glance

| Field | Current value |
| --- | --- |
| Current status | Phase Three closed |
| Current experiment ID | `phase-three.closed-integrated-live-passage` |
| Strongest earned claim | One contained Oracle live-passage envelope across derived/compiled spine, provider lifecycle, Elysia/Bun listener, oRPC Fetch, contained Inngest step passage, telemetry projection, control-plane packet, and stop/finalization |
| Proof ceiling | `simulation-proof` and migration-decision evidence only |
| Current materialization | Shared runtime, Oracle, scenarios, and current tests exist; Reference Runtime source/test/gate do not exist beyond README-level scaffolds |
| Next evidence entrypoint | `systems/README.md`, `vendors/README.md`, `runtime-spine-verification-diagnostic.md` |

## Current State

Phase Three is closed as contained live-runtime-passage simulation evidence and
migration-decision evidence.

The strongest earned claim is one contained Oracle integrated passage:
derived/compiled spine, provider bootgraph startup/finalization, shared
`EffectRuntimeAccess`, counted `ProcessExecutionRuntime`, real local
Elysia/Bun listener, oRPC Fetch boundary, Oracle server harness, contained
Inngest Bun serve/function/step async harness, provider-started resource access
through server and async invocation contexts, OTLP-shaped telemetry projection,
non-persistent migration/control-plane packet, ordered stop/finalization, and
post-stop non-delegation.

This is not Lab-Production Proof and does not authorize Parent-Repo Migration.
The Lab still does not prove durable Inngest semantics, live HyperDX product
visibility, RuntimeCatalog persistence, production-shaped control-plane
topology, final public API/DX law, config/secret-store policy, or final
structure/Nx/generator ratchet.

Phase Four is not open. The Reference Runtime plane is named/reserved and may
have README-level scaffolding only; there is no Reference Runtime source,
Reference Runtime test suite, Reference Runtime gate, Lab-Production Proof
claim, package surface, Nx target, or generator ratchet.

## Current Manifest Experiment

- ID: `phase-three.closed-integrated-live-passage`
- Focus: Phase Three is closed as contained live-runtime-passage
  `simulation-proof` and migration-decision evidence. Child 7 composes the
  earned focused slices into one contained Oracle run while preserving
  non-promotion boundaries for Lab-Production Proof, durable async, product
  observability, RuntimeCatalog persistence, public API/DX, config/secrets, and
  final Nx/generator ratchet work.

## Related Manifest Entries

| Evidence cluster | Manifest entries |
| --- | --- |
| Phase Three closeout and live-passage envelope | `audit.p3.integrated-live-passage-rehearsal-closeout`, `audit.p3.contained-elysia-listen-lifecycle-passage`, `audit.p3.contained-elysia-host-passage`, `audit.p3.layer-disagreement-failure-observation-proof`, `audit.p3.native-boundary-observation-failure-semantics-ledger`, `audit.p3.started-process-assembly-stop-finalization-passage`, `audit.p3.live-runtime-passage-scope-claim-ledger`, `audit.p3.phase-three-program-workstream` |
| Stable authoring and runtime-spine base | `accepted.effect-only-authoring`, `accepted.invocation-bound-clients`, `simulation.middle-spine-derivation-compiler`, `simulation.async-step-owner-membership-artifacts`, `simulation.adapter-callback-bridge-lowering`, `simulation.first-server-async-harness-mounts`, `simulation.oracle-registry-invocation` |
| Telemetry and control-plane observation | `audit.telemetry.hyperdx-observation`, `audit.telemetry.hyperdx-observation.residual`, `audit.migration.control-plane-observation`, `audit.migration.control-plane-observation.residual` |
| Vendor and phase-two spine composition inputs | `vendor.boundary.inngest-handoff-shape`, `audit.p1.effect-boundary-policy-matrix`, `audit.p1.effect-boundary-policy-matrix.residual`, `audit.p1.runtime-resource-access`, `audit.p2.adapter-effect-callback-lowering`, `audit.p2.async-effect-bridge-lowering`, `audit.p2.production-harness-mounting`, `audit.p2.provider-effect-process-spine`, `audit.p2.server-orpc-fetch-boundary`, `audit.p2.async-inngest-function-step-boundary`, `audit.p2.telemetry-integrated-observation-spine`, `audit.p2.integrated-runtime-spine-rehearsal`, `audit.p2.phase-two-program-closeout` |

## Update Rule

Update this file only when `proof-manifest.currentExperiment` changes or a
phase closeout changes the current proof boundary. Do not add owners, dates,
kanban states, or migration tasks here.

When updating this file, also check:

- `proof-manifest.json`
- `runtime-spine-verification-diagnostic.md`
- `systems/runtime-spine-evidence-map.md`
- relevant `systems/*` or `vendors/*` concept maps
