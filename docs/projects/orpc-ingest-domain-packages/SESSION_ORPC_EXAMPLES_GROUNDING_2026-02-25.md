# Session Grounding and Posture — ORPC Domain Examples

Created: 2026-02-25
Branch: `agent-codex-dev-orpc-domain-examples-grounding-session`
Status: Active grounding document (living; update as grounding deepens)

## Purpose

Capture the working agreement for this session: what we are trying to accomplish, how we will execute, and the workflow invariants we will hold.

This document is intentionally iterative. During grounding, it should be updated as we resolve ambiguities and tighten standards.

## Source Prompt (Combined/Cleaned from User Instructions)

- We are at the top of the Graphite stack.
- A meaningful portion of ORPC + Inngest architecture is already implemented in the pages/plugins system.
- The current gap is high-quality practical examples that show the architecture in real usage and surface unresolved tensions from specs.
- Prior examples exist but are currently unreliable; we have not yet landed the simplest example that satisfies requirements.

Planned sequence:

1. Build three example domain packages in escalating complexity:
1. Simplest (`n = 1`) example that still meets requirements.
1. Intermediate example.
1. Advanced example that trends toward `n = infinity` (scalable pattern).

Operating model:

- Use a tight back-and-forth loop and move one step at a time.
- Keep a scratch-pad list of decisions/guardrails that evolves into the domain package standard.
- Existing specification packet is reference material, but not primary source of truth for this phase.
- Use first-principles ORPC/Inngest reasoning when tensions exist.
- Current phase priority is ORPC; Inngest is explicitly de-scoped for now.

Stewardship expectations:

- Move deliberately; do not outrun understanding.
- If something is unclear/inconsistent/smells wrong, pause and ask focused questions.
- Only spin up additional agents when explicitly instructed.

Immediate checkpoint asked by user:

- Create a new worktree and a new Graphite branch there.
- First commit on that branch adds this grounding/posture document.
- Return with completion confirmation.

## Session Goal (Current)

Produce a grounded, enforceable path to three ORPC-focused domain package examples that move from minimal to scalable while preserving architectural coherence and avoiding spec drift.

## Working Execution Shape

1. Keep each move small and reviewable.
1. Use observed repo reality plus first-principles architecture, not assumptions.
1. Capture decisions as explicit guardrails/invariants as soon as they are made.
1. Treat the simplest example as the proof surface for standards.
1. Increase complexity only after lower-level shape is stable.

## Workflow Invariants (Current)

- Graphite-first branch/stack operations.
- Worktree isolation for active implementation passes.
- No silent assumption jumps; ambiguity gets explicit questions.
- Minimal diffs consistent with repo patterns.
- Keep focus on accepted scope; call out any intentional scope expansion.
- Keep a living decision log/guardrail list in this grounding track.
- ORPC-first in this phase; avoid dragging Inngest decisions into early example design unless strictly necessary.

## Guardrails and Pins (Seed List)

- Pin A: Example quality matters more than example quantity.
- Pin B: `n = 1` example must still satisfy real requirements (not toy-only).
- Pin C: Intermediate and advanced examples must show continuity with the same underlying package standards.
- Pin D: Domain package standards must become explicit and enforceable (not implicit narrative only).

## Open Questions (To Resolve During Grounding)

- What exact “must-pass” criteria define success for the simplest ORPC example?
- Which existing example artifacts should be preserved, refactored, or discarded?
- What is the minimal domain package invariant set we can enforce immediately without overfitting?

## Implementation Decisions

### D-001 — Session grounding document location

- Context: The user asked for an initial grounding/posture doc as first commit on a fresh worktree branch.
- Options considered:
  - Create in `docs/projects/orpc-ingest-domain-packages/` alongside existing initiative artifacts.
  - Create in a generic `docs/process/` location.
- Choice: Create in `docs/projects/orpc-ingest-domain-packages/`.
- Rationale: Keeps this session artifact adjacent to the existing domain-package grounding/BOOK materials it will evolve with.
- Risk: Low; this is doc placement only and can be relocated later if doc architecture demands it.
