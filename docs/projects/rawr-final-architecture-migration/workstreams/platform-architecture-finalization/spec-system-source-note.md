# RAWR Specification System Source Note

Status: final source/change note for the workstream-produced companion specification.

## Sources Used

Primary authority inputs:

- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`
- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
- `docs/projects/rawr-final-architecture-migration/workstreams/platform-architecture-finalization/agent-team-invariants-to-spec-prompt.md`
- `docs/projects/rawr-final-architecture-migration/workstreams/platform-architecture-finalization/integrated-updated-plan.md`
- `docs/projects/rawr-final-architecture-migration/workstreams/platform-architecture-finalization/integration-delta-change-doc.md`

Harvest/provenance input:

- `/Users/mateicanavra/Documents/projects/RAWR/_inbox/RAWR_System_Architecture_Canonical_Spec_Latest.md`

Workstream/process inputs:

- `habitat:workstream-runner`
- `habitat:workstream-review-loops`
- `cognition:team-design`

## What Changed

The workstream produced the standalone `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Specification_System_Spec.md` as a companion authority for cross-specification governance.

The spec defines:

- hub/companion corpus model;
- authority ownership and delegation rules;
- companion attachment protocol;
- reserved-boundary, deferral, and gap discipline;
- supersession, harvesting, and stale-copy handling;
- platform/runtime boundary rules;
- runtime noun placement rules;
- review gates and failure modes for future specification work.

Supporting artifacts:

- `RAWR_Specification_System_Spec.md` in the workstream directory is a non-authority pointer to the normative spec path.
- `spec-system-invariant-extraction-table.md`
- `spec-system-boundary-review.md`
- `spec-system-red-team-review.md`
- `record.md`

## Preserved Uncertainty

The companion spec intentionally does not settle:

- exact final runtime noun allow-list for the Platform Architecture Specification;
- whether and where to add a platform sentence banning Effect-prefixed semantic kinds such as `EffectService` and `EffectPlugin`;
- final placement/indexing convention if the companion later moves from the workstream directory into `resources/spec/`;
- platform/deployment external-interface lock points beyond current boundary rules;
- OpenShell governance/vendor details beyond harness/native-interior status and reserved-boundary handling;
- repo-wide stale-copy cleanup.

These remain open or reserved because settling them would either rewrite the platform spec, rewrite the runtime spec, or perform repo-wide cleanup outside this workstream.

## DRA Notes

- The authority ladder used during this workstream is source-specific. Future specifications should use the general owner-first authority model in the spec-system companion, not inherit this workstream's branch, plan docs, or `_inbox/latest` as standing corpus authority.
- `_inbox/latest` supplied useful hub, authority, reserved-boundary, and deferral/gap wording. It remains harvest/provenance, not baseline authority.
- Latest-derived rules were adopted only where independently supported by current specs, the approved workstream prompt/plan, or explicit DRA synthesis recorded in `spec-system-invariant-extraction-table.md`.
- Runtime realization supplied the strongest implicit conventions for authority notes, stale-source containment, exactness metadata, read-model boundaries, reserved details, and component/ownership summaries.
- The spec-system document generalizes only the corpus-governance shape of those conventions. It does not import runtime mechanics.
