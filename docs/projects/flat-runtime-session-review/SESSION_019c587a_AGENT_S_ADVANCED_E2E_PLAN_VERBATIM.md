# SESSION_019c587a — Agent S Advanced E2E Plan (Verbatim)

## Mission (Updated, Authoritative)
Author an advanced tutorial-style end-to-end walkthrough that solves the real integration problem:
1. a micro-frontend must consume the logic it needs (including workflow-related logic),
2. without duplicating definitions/semantics across layers,
3. while staying aligned with ORPC + Inngest packet boundaries.

This mission explicitly does **not** preselect a single implementation path (for example, API-plugin consumption).

## Owned Output Files
1. Plan (this file):
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_S_ADVANCED_E2E_PLAN_VERBATIM.md`
2. Scratchpad:
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_S_ADVANCED_E2E_SCRATCHPAD.md`
3. Final walkthrough:
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md`

## Locked Inputs
1. Skill grounding:
- `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/elysia/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/typebox/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/architecture/SKILL.md`
2. Context packet:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_E2E_WALKTHROUGHS_AGENT_CONTEXT_PACKET.md`
3. Canonical source set listed in that context packet (all 12 docs).
4. Additional decision/support context consulted for this advanced variant:
- `docs/projects/flat-runtime-session-review/SESSION_019c587a_E2E_WALKTHROUGHS_ORCHESTRATOR_SCRATCHPAD.md`
- `docs/system/spec-packet/DECISIONS.md`
- `docs/projects/flat-runtime-session-review/SESSION_019c587a_INVARIANTS_POLICIES_REFERENCE.md`

## Hard Rules (Non-Negotiable)
1. TypeBox-first.
2. Preserve split semantics: `/api/workflows/...` trigger path vs `/api/inngest` runtime ingress.
3. No hand-waving in host/composition/mount glue.
4. Clearly separate browser-safe and server-only code.
5. Docs-only work (no runtime code edits).
6. Do not edit Agent A/B artifacts.

## Decision Protocol for the Advanced Walkthrough
1. Compare viable architecture-compatible paths for micro-frontend logic consumption.
2. Evaluate each path against packet invariants:
- no plugin-to-plugin runtime imports,
- package internal client default for in-process server calls,
- explicit trigger vs ingress split,
- boundary-layer auth/visibility enforcement.
3. Choose one recommended default path.
4. Include alternatives considered with reject/defer rationale.
5. Include explicit unresolved gaps where the repo/policy is not fully settled.

## Candidate Paths To Evaluate
1. API-plugin-centric client path (micro-frontend consumes boundary APIs directly).
2. Shared-package-first path (micro-frontend consumes browser-safe shared package logic + workflow trigger/status surface).
3. Host-injected gateway path (host shell provides pre-wired capability calls to micro-frontend).
4. Disallowed anti-pattern baseline (micro-frontend directly targets `/api/inngest` or server-only internals) for explicit rejection.

## Required Final Walkthrough Sections
1. Goal/use-case framing.
2. E2E topology diagram.
3. Canonical file tree.
4. Key files with concrete code.
5. Wiring steps: host -> composition -> plugin/package -> runtime.
6. Runtime sequence walkthrough.
7. Rationale/trade-offs.
8. What can go wrong + guardrails.
9. Explicit policy consistency checklist.
10. Unresolved Gaps (mandatory).

## Done Criteria
1. At least one full, concrete chosen implementation is shown end-to-end.
2. Alternatives are explicitly compared and dispositioned (recommended/rejected/deferred).
3. Auth boundaries, trigger semantics, status/result path, and browser-safe vs server-only boundaries are explicit.
4. Split semantics (`/api/workflows` vs `/api/inngest`) are preserved as canonical unless explicitly marked as open question.
5. Unknowns are not hidden; unresolved points are captured in `Unresolved Gaps`.
