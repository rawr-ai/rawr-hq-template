# Phase Three Program Workstream DRA Workflow Draft

Status: draft re-grounding anchor only.
Scope: future next-phase runtime-realization program workstream.

This document is not the Phase Three plan, not runtime architecture authority,
not proof authority, and not a workstream report. It is my persistent
program-level operating anchor for the next phase once the phase structure is
designed and approved.

**Frame I’ll Carry Forward**

The runtime-realization program is a contained proof program, not a production migration. The lab under [tools/runtime-realization-type-env](/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq-template/tools/runtime-realization-type-env/README.md:1) exists to prove the target runtime spine in a miniature, falsifiable environment before we migrate the real parent app. The eventual claim we are working toward is: the system basically works in a fully runnable toy-contained runtime realization, and the remaining uncertainty is small enough to migrate production with confidence.

Authority order is now clear: the manifest-pinned runtime spec is the runtime authority, and its hash matches the manifest. The architecture spec supplies the larger ontology and shape, but runtime realization mechanics are governed by [RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md](/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq-template/docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md:1). Workstream reports and handoffs are continuity, not proof authority.

Phase Two proved contained spine composition. It proved that lab declarations can flow through derivation/compilation, provider/config/Effect provisioning, mini bootgraph/process runtime, contained oRPC Fetch handling, contained Inngest Bun serve/function/step handling, redacted telemetry/catalog/control-plane projection, and an integrated rehearsal. That is real evidence, but it is mostly `simulation-proof`: current manifest counts are `proof: 4`, `vendor-proof: 6`, `simulation-proof: 23`, `xfail: 14`, `todo: 1`, `out-of-scope: 5`.

What Phase Two did not prove remains the critical boundary: no production runtime passage, no real Elysia mount, no production HTTP/worker lifecycle, no durable Inngest scheduling/retry/replay/idempotency/run history, no live HyperDX product query/dashboard/retention semantics, no RuntimeCatalog persistence, no control-plane topology, no deployment placement, no final public API/DX law, no production config/secret-store policy, no Nx/generator ratchet, and no production migration readiness.

The next focus category is therefore live-runtime-passage investigation. Not Phase 3 planning yet, but the frame is: determine how much of the actual runtime passage can be proven inside the mini-runtime container across runtime execution, host lifecycle, vendor crossings, telemetry/logging, HyperDX visibility, and observable outcomes, while avoiding incidental production/repo risk.

“Good” for the upcoming phase means leverage, not caution for its own sake: draw the right contained scope, then push proof depth hard inside it. “Done” will mean every claim has an earned proof category and named gate, every non-green residual has an authority home and re-entry trigger, and nothing vendor-only or lab-simulation-only is promoted into production readiness.

My role going forward: I am the DRI for designing and coordinating that next workstream program when you ask for it. I should use agents as evidence/review lanes where useful, but I own authority order, scope, synthesis, proof promotion, residual handling, verification, and repo cleanliness.

Verification I ran now: `bunx nx run runtime-realization-type-env:gate` passed. No file edits were made, and the repo remains clean.

Skills used: architecture, target-authority-migration, rawr-hq-orientation.

## Draft Boundary

The frame above is the current operating anchor. The program structure below is
intentionally not filled in yet because the next phase workstream has not been
designed, reviewed, or approved.

Until approval, this document should only preserve re-grounding state. It must
not accumulate scope, task breakdowns, investigation findings, or proof claims.
Those belong in the approved workstream report, manifest, diagnostic, spine
map, focus log, spec feedback, or handoff.

## Current Re-Grounding State

- Current phase design status: not started.
- Current next-focus category: live-runtime-passage investigation inside the
  mini-runtime container.
- Current proof boundary: Phase Two is contained spine-composition proof, not
  production readiness.
- Current role: DRA/DRI for the next program workstream once the user asks for
  design and coordination.
- Current next user-facing action: restate the frame and give a general
  look-ahead on the planning workstream without starting the plan.

## Workflow Sections To Fill After Approval

When the next phase workstream structure is designed and approved, complete
this workflow with:

- level map and compaction recovery gate;
- active authority anchor and required first reads;
- program workstream entry/exit rules;
- child workstream lifecycle and report contract;
- agent topology, scratch-document rules, and review lanes;
- proof promotion and proof non-promotion gates;
- deferred inventory routing and re-entry triggers;
- repo, Graphite, Nx, and cleanup gates;
- closeout and next-handoff contract.
