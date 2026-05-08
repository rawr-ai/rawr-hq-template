# RAWR Specification System Optimization Review

Date: 2026-05-08.

Scope: optimize `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Specification_System_Spec.md` after review found that the prior version had useful governance material but read too much like a flat rule ledger, over-centered platform/runtime, and risked turning specifications into status objects.

## Goal Frame

Objective: make the RAWR Specification System companion useful as a cold-start reference for future spec authors, reviewers, and DRAs while preserving concrete RAWR governance constraints.

Primary repairs:

- Make purpose, audience, and reader workflow visible early.
- Separate specifications from status/reference metadata.
- Scope rules by artifact or document shape instead of applying every rule globally.
- Preserve hub/companion authority, smallest-claim ownership, attachment protocol, exactness labels, reserved/deferral/gap discipline, stale-source handling, and harvesting-is-not-promotion.
- Move platform/runtime detail into an application profile rather than treating it as the whole spec-system model.

## Phase Summary

1. Grounding: verified clean Graphite worktree on `codex/platform-spec-finalization`; read the current spec, skills, and review findings.
2. Rewrite: restructured the spec around reader use, specification shapes, authority metadata axes, core authority model, hub/companion rules, companion attachment, non-authority material, unsettled material, acceptance gates, failure modes, platform/runtime application profile, reserved decisions, and glossary.
3. Leaf review loop: ran three read-only review lanes for information shape, authority/status-object boundary, and source-preservation/platform-runtime scoping.
4. Repair loop: accepted all material findings and patched the spec.
5. Composed closure review: ran a final read-only composed review; verdict was close with no material P1/P2/P3 findings.

## Review Findings And Disposition

| Finding | Severity | Disposition | Repair |
| --- | --- | --- | --- |
| Shape selection was strong, but non-companion build guidance was thin. | P2 | accepted | Added `Build path by shape` table. |
| Acceptance gates lacked pass/fail evidence output shape. | P2 | accepted | Added failed-gate output contract. |
| Runtime profile was fenced but remained the only concrete example. | P3 | accepted | Added non-runtime semantic-graph/read-model example. |
| Reserved decision inventory could be mistaken for full deferral records. | P3 | accepted | Renamed and described it as reserved inventory, not a deferral ledger. |
| Metadata classification could overburden trivial references. | P3 | accepted | Narrowed classification trigger to authority, promotion, cleanup, or normative reliance. |
| `seam` wording was inconsistent in reserved detail rules. | P3 | accepted | Changed to `boundary/seam`. |
| Attachment declaration lost explicit `Authority owner`. | P2 | accepted | Restored `Authority owner:` in the attachment template. |
| Stale cleanup was slightly softened. | P3 | accepted | Required deferred cleanup record with owner/future DRA, authority home, and trigger when physical cleanup is not practical. |

## Closure Review Result

Composed review verdict: close.

No material P1/P2/P3 findings remained after repair. The final reviewer confirmed:

- The spec now has a clear audience, purpose, and through line.
- Specifications are separated from status/reference metadata.
- Rules are scoped by artifact shape and gates are conditional.
- Attachment protocol is conditional and includes authority ownership.
- Read models/examples are non-authority unless promoted.
- Platform/runtime content is an application profile.
- Original governance constraints remain preserved.

## Gates

- `git diff --check`: passed during rewrite and after accepted repairs.
- Final Graphite/git state is recorded in the workstream closure response.
