# Axis 10: Legacy Metadata and Lifecycle Simplification

## Canonical Core Reference
- Canonical subsystem policy and global invariants: [ARCHITECTURE.md](../ARCHITECTURE.md).
- Architecture-level decision authority: [DECISIONS.md](../DECISIONS.md).
- This axis is a focused slice and does not override canonical core policy.

## Axis Opening
- **What this axis is:** the canonical policy slice for runtime metadata simplification and lifecycle semantics authority.
- **What it covers:** retained-vs-removed metadata runtime meaning, manifest-first runtime authority, and downstream conformance obligations.
- **What this communicates:** runtime behavior is keyed by manifest + surface + capability identity, while legacy metadata fields are non-runtime.
- **Who should read this:** maintainers updating runtime/docs/testing contracts and reviewers validating D-013 policy conformance.
- **Jump conditions:** for host composition determinants, jump to [07-host-composition.md](./07-host-composition.md); for workflow/API split semantics, jump to [08-workflow-api-boundaries.md](./08-workflow-api-boundaries.md); for distribution/lifecycle carry-forward, jump to [13-distribution-and-instance-lifecycle-model.md](./13-distribution-and-instance-lifecycle-model.md).

## In Scope
- Target-state metadata contract for runtime composition semantics.
- Removal of legacy metadata fields from runtime behavior.
- Lifecycle and conformance obligations that must be reflected in downstream docs/runbooks/testing artifacts.

## Out of Scope
- Implementation sequencing or migration mechanics.
- Editing external process/runbook/testing docs in this packet pass.
- Changing D-005..D-012 route/ownership/caller/context/middleware/schema semantics.

## Canonical Policy
1. Runtime composition behavior MUST be inferable from plugin surface root, `rawr.kind`, `rawr.capability`, and manifest registration in `rawr.hq.ts`.
2. `templateRole` and `channel` are removed runtime semantics and MUST NOT drive route mounting, caller-mode behavior, auth posture, runtime ingress selection, or durable execution behavior.
3. `publishTier` and `published` are release/distribution metadata only and MUST NOT drive runtime composition, host route exposure, or runtime wiring behavior.
4. Manifest-first composition via generated `rawr.hq.ts` is the sole runtime composition authority in target-state packet language.
5. This axis does not alter D-005..D-012 semantics; route split, ownership, caller transport boundaries, and context/middleware/schema policies remain unchanged.

## Retained vs Removed Metadata Semantics
| Metadata field | Runtime semantic status | Allowed role in target state |
| --- | --- | --- |
| `rawr.kind` | retained runtime semantic | required runtime surface typing |
| `rawr.capability` | retained runtime semantic | required capability identity across routing/lifecycle |
| plugin surface root (`plugins/api`, `plugins/workflows`, etc.) | retained runtime semantic | required composition boundary input |
| `rawr.hq.ts` manifest registration | retained runtime semantic | sole runtime assembly authority |
| `templateRole` | removed runtime semantic | optional descriptive metadata only |
| `channel` | removed runtime semantic | optional descriptive metadata only |
| `publishTier` | non-runtime | optional release/distribution metadata |
| `published` | non-runtime | optional release/distribution metadata |

## Lifecycle and Conformance Obligations
These are required policy obligations for downstream artifacts; this packet does not edit those artifacts directly.

1. Documentation/process/runbook obligations:
   - Remove any runtime behavior claims for `templateRole`, `channel`, `publishTier`, or `published`.
   - Keep runtime composition descriptions manifest-first (`rawr.hq.ts`) and surface/capability keyed.
2. Testing/lint obligations:
   - Enforce `manifest-smoke` for expected manifest exports.
   - Enforce `metadata-contract` requiring `rawr.kind` + `rawr.capability`.
   - Enforce `import-boundary` (no plugin-to-plugin runtime coupling).
   - Enforce `host-composition-guard` (no ad hoc cross-surface host composition outside manifest contract).
3. Lifecycle/status tooling obligations:
   - Report and operate by `rawr.kind` + `rawr.capability`.
   - Treat manifest-owned surfaces as canonical runtime topology.

## Changed vs Unchanged Snapshot
- **Changed:** legacy metadata fields (`templateRole`, `channel`) are no longer runtime-driving; release posture fields (`publishTier`, `published`) are explicitly non-runtime.
- **Unchanged:** D-005..D-012 semantics for route split, contract ownership, caller transport/publication boundaries, host ordering, context envelopes, middleware split, and schema ownership posture.

## Why
- Reduces semantic ambiguity in runtime composition.
- Keeps runtime behavior deterministic and auditable.
- Preserves clear separation between runtime architecture and release/governance metadata.

## Trade-Offs
- Legacy field names can still appear in files, but they no longer carry runtime composition meaning.
- Downstream docs/tests need explicit conformance checks to prevent semantic drift back to removed runtime keys.

## Cross-Axis Links
- Host composition and explicit mount ownership: [07-host-composition.md](./07-host-composition.md)
- Workflow/API split semantics: [08-workflow-api-boundaries.md](./08-workflow-api-boundaries.md)
- Split-vs-collapse anti-dual-path posture: [03-split-vs-collapse.md](./03-split-vs-collapse.md)
- Durable endpoint additive-only constraints: [09-durable-endpoints.md](./09-durable-endpoints.md)

## Archive Source Anchors
- `../../_archive/orpc-ingest-workflows-spec/session-artifacts/prework-reshape-cleanup-2026-02-18/additive-extractions/LEGACY_METADATA_REMOVAL.md`
- `../../_archive/orpc-ingest-workflows-spec/session-artifacts/prework-reshape-cleanup-2026-02-18/additive-extractions/LEGACY_TESTING_SYNC.md`
- `../../_archive/orpc-ingest-workflows-spec/session-artifacts/prework-reshape-cleanup-2026-02-18/additive-extractions/LEGACY_DECISIONS_APPENDIX.md`
