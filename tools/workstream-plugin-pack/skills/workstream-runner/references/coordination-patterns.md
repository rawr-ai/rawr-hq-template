# Coordination Patterns

Internal-to-one-workstream coordination patterns. Use when a workstream needs
to share state across phases or coordinate parallel lane edits on a shared
artifact. Both patterns sit inside one workstream and do not create new
workstreams or governance layers.

## Pattern A — Cross-phase state propagation

When a Phase 0 decision must reach a later phase's worker briefs, the state
lives in `assets/decisions.md` as a live-state header that worker briefs cite
by reference, not by copy-paste.

Worker briefs include a `Decisions in effect for this lane:` slot naming
which decisions apply. A change in `decisions.md` becomes a brief
invalidation: any brief whose cited decisions have been re-decided must be
re-issued. Copy-paste of decision content into briefs is forbidden — it loses
the invalidation signal.

Working reference: `docs/projects/rawr-final-architecture-migration/workstreams/runtime-architecture-alignment/findings/wave-1-packet.md`. The packet cites Decisions #2, #4, #5, and W-4 by ID rather than restating their content.

## Pattern B — Parallel-lane coordination on a shared artifact

When multiple lanes edit one file in parallel, workers do not edit the
shared artifact directly. They write patch files — BEFORE/AFTER blocks in
`findings/lane-X-patch.md` — and the DRA serializes application via the
editor. This avoids race conditions, gives auditable provenance, and keeps
lane-level commits atomic.

Optional alternative: dedicated lane branches that the DRA merges in order.
Use when the patch-file pattern would lose semantic context (e.g., multiline
structural edits where AFTER blocks are hard to read in isolation).

Working reference: `docs/projects/rawr-final-architecture-migration/workstreams/runtime-architecture-alignment/findings/lane-1-1-patch.md`. The patch file uses explicit BEFORE/AFTER blocks that the DRA applied via Edit.

## When neither pattern fits

A single-worker serial workstream with no shared-artifact contention and no
cross-phase state to propagate needs neither pattern. The single
DRA-and-worker rendezvous is sufficient.
