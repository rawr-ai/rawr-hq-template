# Axis 13: Distribution and Instance Lifecycle Model

## Canonical Core Reference
- Canonical subsystem policy and global invariants: [ARCHITECTURE.md](../ARCHITECTURE.md).
- Architecture-level decision authority: [DECISIONS.md](../DECISIONS.md).
- This axis is canonical policy language for D-016 and does not override locked D-005..D-015 semantics.

## Axis Opening
- **What this axis is:** the canonical policy slice for D-016 distribution defaults and instance-lifecycle boundaries.
- **What it covers:** consumer-vs-maintainer distribution posture, alias/instance seam requirements, and do-now vs defer-later lifecycle scope boundaries.
- **What this communicates:** distribution posture and lifecycle seams are explicit now, while broader UX/packaging mechanics remain deferred.
- **Who should read this:** maintainers defining distribution lifecycle posture, reviewers checking D-016 conformance, and teams validating instance-aware runtime assumptions.
- **Jump conditions:** for metadata runtime semantics carried forward, jump to [10-legacy-metadata-and-lifecycle-simplification.md](./10-legacy-metadata-and-lifecycle-simplification.md); for testing implications, jump to [12-testing-harness-and-verification-strategy.md](./12-testing-harness-and-verification-strategy.md); for decision authority, use [DECISIONS.md](../DECISIONS.md).

## In Scope
- Distribution default posture for consumers vs maintainers.
- Instance lifecycle policy seams required now at contract level.
- Do-now vs defer-later boundary for packaging/UX mechanics.
- Explicit carry-forward of D-013 metadata semantics and D-015 testing implications.

## Out of Scope
- Packaging implementation sequencing and automation rollout details.
- Full UX and control-plane productization for multi-instance management.
- Editing downstream process/runbook/testing artifacts in this packet pass.

## Canonical Policy
1. `RAWR HQ-Template` remains upstream engineering truth for shared behavior and architecture policy.
2. Default consumer distribution path is **instance-kit / no-fork-repeatability**.
3. Long-lived fork posture is a maintainer path and is NOT the default consumer path.
4. Manifest-first authority remains explicit: generated `rawr.hq.ts` is canonical composition authority.
5. Runtime lifecycle semantics remain constrained to plugin surface root + `rawr.kind` + `rawr.capability` + manifest registration; legacy metadata fields are non-runtime (D-013 unchanged).
6. Multi-owner invariant is required now: no new singleton-global assumptions may be introduced in composition/runtime contracts.
7. Alias/instance seam is required now by contract; full feature UX/packaging mechanics are deferred.
8. This axis is additive and does not alter D-005..D-015 route/ownership/caller/context/middleware/schema/testing semantics.

## Why
- Locks a stable distribution default while preserving upstream engineering authority.
- Makes multi-owner/instance safety explicit before broader lifecycle productization.
- Keeps D-013 metadata and D-015 harness implications aligned under one lifecycle posture.

## Trade-Offs
- Immediate policy scope is contract-level, so full UX/automation details stay intentionally deferred.
- Maintainer and consumer paths remain distinct, which increases clarity but requires explicit posture communication.

## Do-Now vs Defer-Later Boundary (Centralized)
| Category | Do now (locked) | Defer later (centralized here) |
| --- | --- | --- |
| Distribution default | Instance-kit/no-fork-repeatability is default consumer posture. | Broader distribution ergonomics and packaging UX workflows. |
| Fork policy | Long-lived fork remains maintainer-only path by default. | Maintainer tooling/process optimization for long-lived fork operations. |
| Runtime authority | `rawr.hq.ts` manifest composition authority is required. | Additional composition automation layers on top of manifest contract. |
| Lifecycle semantics | Runtime keyed by `rawr.kind` + `rawr.capability`; legacy metadata non-runtime. | Expanded lifecycle dashboards/UX beyond current contract surface. |
| Multi-owner behavior | Alias/instance seam is contract-required; no singleton-global assumptions. | Full multi-instance control-plane product features and packaging details. |

## D-013 Migration Implications (Carry-Forward)
1. Metadata migration remains mandatory: runtime claims tied to `templateRole`, `channel`, `publishTier`, and `published` stay removed from runtime behavior language.
2. Lifecycle/status semantics remain keyed to `rawr.kind` + `rawr.capability` and manifest-owned composition surfaces.
3. Downstream conformance gates remain required: `manifest-smoke`, `metadata-contract`, `import-boundary`, `host-composition-guard`.

## D-015 Testing Blast-Radius Implications
1. Harness policy remains Axis 12 authority; this axis adds required seam checks, not a new harness model.
2. Boundary/runtime suites MUST include assertions that instance resolution honors alias/instance seam contracts.
3. Negative tests MUST guard against singleton-global assumptions in instance-aware runtime composition.
4. `/api/inngest` remains runtime-ingress verification only; distribution/lifecycle policy does not reclassify caller route semantics.

## What Changes vs Unchanged
- **Changes:** Default distribution posture is explicitly locked to instance-kit/no-fork-repeatability; long-lived fork posture is explicitly scoped to maintainers; alias/instance seam becomes a required now-contract with deferred UX mechanics centralized in this axis.
- **Unchanged:** D-005 route split, D-006 boundary ownership, D-007 caller/publication boundaries, D-008 bootstrap order, D-009/D-010 open status, D-011/D-012 schema/context ownership, D-013 metadata runtime simplification, D-014 composition guarantees, and D-015 harness model.

## References
- [ARCHITECTURE.md](../ARCHITECTURE.md)
- [DECISIONS.md](../DECISIONS.md)
- [10-legacy-metadata-and-lifecycle-simplification.md](./10-legacy-metadata-and-lifecycle-simplification.md)
- [12-testing-harness-and-verification-strategy.md](./12-testing-harness-and-verification-strategy.md)
