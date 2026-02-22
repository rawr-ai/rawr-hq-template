# Axis 10: Legacy Metadata Hard Deletion and Lifecycle Simplification

## Canonical Core Reference
- Canonical subsystem policy and global invariants: [ARCHITECTURE.md](../ARCHITECTURE.md).
- Architecture-level decision authority: [DECISIONS.md](../DECISIONS.md).
- This axis is a focused slice and does not override canonical core policy.

## Axis Opening
- **What this axis is:** the canonical policy slice for hard deletion of legacy plugin metadata fields and lifecycle semantics authority.
- **What it covers:** retained runtime identity keys, forbidden legacy keys, manifest-first authority, and downstream conformance obligations.
- **What this communicates:** runtime behavior is keyed only by manifest + surface + capability identity, and legacy metadata fields are removed from non-archival runtime/tooling/scaffold metadata surfaces.
- **Who should read this:** maintainers updating runtime/docs/testing contracts and reviewers validating D-013 conformance.
- **Jump conditions:** for host composition determinants, jump to [07-host-composition.md](./07-host-composition.md); for workflow/API split semantics, jump to [08-workflow-api-boundaries.md](./08-workflow-api-boundaries.md); for distribution/lifecycle carry-forward, jump to [13-distribution-and-instance-lifecycle-model.md](./13-distribution-and-instance-lifecycle-model.md).

## In Scope
- Target-state metadata contract for runtime composition semantics.
- Hard deletion of legacy metadata fields from active plugin metadata contracts.
- Lifecycle and conformance obligations that must be reflected in downstream docs/runbooks/testing artifacts.

## Out of Scope
- Implementation sequencing or migration mechanics.
- Editing external process/runbook/testing docs in this packet pass.
- Changing D-005..D-012 route/ownership/caller/context/middleware/schema semantics.

## Canonical Policy
1. Runtime composition behavior MUST be inferable from plugin surface root, `rawr.kind`, `rawr.capability`, and manifest registration in `rawr.hq.ts`.
2. `templateRole`, `channel`, `publishTier`, and `published` are hard-deleted from non-archival runtime/tooling/scaffold metadata surfaces and MUST NOT appear in active plugin manifests, parser outputs, runtime wiring, lifecycle tooling, or conformance fixtures.
3. Metadata validation and parser contracts MUST hard-fail when any forbidden legacy key is present.
4. Manifest-first composition via generated `rawr.hq.ts` is the sole runtime composition authority in target-state packet language.
5. This axis does not alter D-005..D-012 semantics; route split, ownership, caller transport boundaries, and context/middleware/schema policies remain unchanged.

## Retained vs Removed Metadata Semantics
| Metadata field | Runtime semantic status | Allowed role in target state |
| --- | --- | --- |
| `rawr.kind` | retained runtime semantic | required runtime surface typing |
| `rawr.capability` | retained runtime semantic | required capability identity across routing/lifecycle |
| plugin surface root (`plugins/api`, `plugins/workflows`, etc.) | retained runtime semantic | required composition boundary input |
| `rawr.hq.ts` manifest registration | retained runtime semantic | sole runtime assembly authority |
| `templateRole` | forbidden/removed | none |
| `channel` | forbidden/removed | none |
| `publishTier` | forbidden/removed | none |
| `published` | forbidden/removed | none |

## Lifecycle and Conformance Obligations
These are required policy obligations for downstream artifacts; this packet does not edit those artifacts directly.

1. Documentation/process/runbook obligations:
   - Remove any active metadata contract examples or behavior claims using `templateRole`, `channel`, `publishTier`, or `published`.
   - Keep runtime composition descriptions manifest-first (`rawr.hq.ts`) and surface/capability keyed.
2. Testing/lint obligations:
   - Enforce `manifest-smoke` for expected manifest exports.
   - Enforce `metadata-contract` requiring `rawr.kind` + `rawr.capability` and forbidding legacy keys.
   - Enforce `import-boundary` (no plugin-to-plugin runtime coupling).
   - Enforce `host-composition-guard` (no ad hoc cross-surface host composition outside manifest contract).
3. Lifecycle/status tooling obligations:
   - Report and operate by `rawr.kind` + `rawr.capability`.
   - Treat manifest-owned surfaces as canonical runtime topology.
   - Do not emit, persist, or consume forbidden legacy metadata keys in active lifecycle workflows.

## Changed vs Unchanged Snapshot
- **Changed:** legacy metadata fields (`templateRole`, `channel`, `publishTier`, `published`) are removed from non-archival runtime/tooling/scaffold metadata surfaces and conformance surfaces.
- **Unchanged:** D-005..D-012 semantics for route split, contract ownership, caller transport/publication boundaries, host ordering, context envelopes, middleware split, and schema ownership posture.

## Why
- Removes semantic ambiguity and dead-key drift in runtime composition and lifecycle tooling.
- Keeps runtime behavior deterministic and auditable.
- Eliminates legacy-field fallback pathways that cause policy drift.

## Trade-Offs
- Existing manifests/tooling/tests that still declare legacy metadata fields require direct migration.
- There is no compatibility bridge for legacy keys in target-state conformance.

## Cross-Axis Links
- Host composition and explicit mount ownership: [07-host-composition.md](./07-host-composition.md)
- Workflow/API split semantics: [08-workflow-api-boundaries.md](./08-workflow-api-boundaries.md)
- Split-vs-collapse anti-dual-path posture: [03-split-vs-collapse.md](./03-split-vs-collapse.md)
- Durable endpoint additive-only constraints: [09-durable-endpoints.md](./09-durable-endpoints.md)

## Archive Source Anchors
- `../../_archive/orpc-ingest-workflows-spec/session-artifacts/prework-reshape-cleanup-2026-02-18/additive-extractions/LEGACY_METADATA_REMOVAL.md`
- `../../_archive/orpc-ingest-workflows-spec/session-artifacts/prework-reshape-cleanup-2026-02-18/additive-extractions/LEGACY_TESTING_SYNC.md`
- `../../_archive/orpc-ingest-workflows-spec/session-artifacts/prework-reshape-cleanup-2026-02-18/additive-extractions/LEGACY_DECISIONS_APPENDIX.md`
