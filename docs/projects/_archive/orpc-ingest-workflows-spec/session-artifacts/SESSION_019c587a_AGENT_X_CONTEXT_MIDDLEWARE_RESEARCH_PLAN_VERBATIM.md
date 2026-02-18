# SESSION_019c587a — Agent X Context+Middleware Research Plan (Verbatim)

## Mission
Deliver a research-first, source-backed context+middleware walkthrough that is implementation-ready and policy-aligned for:
1. Internal capability package context/middleware.
2. API plugin boundary context/middleware.
3. Workflow trigger context/middleware and Inngest runtime context/middleware.

## Ownership
Owned files for this task:
1. `docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_X_CONTEXT_MIDDLEWARE_RESEARCH_PLAN_VERBATIM.md`
2. `docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_X_CONTEXT_MIDDLEWARE_RESEARCH_SCRATCHPAD.md`
3. `docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_X_CONTEXT_MIDDLEWARE_RESEARCH_FINDINGS.md`
4. `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`

## Required Inputs
1. Skill grounding (must read before research):
- `/Users/mateicanavra/.codex-rawr/skills/deep-search/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/web-search/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/elysia/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/typebox/SKILL.md`
2. Local policy/convention anchors:
- `docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`
- Existing examples: `E2E_01`, `E2E_02`, `E2E_03`

## Research Protocol (Strict Order)
1. DeepSearch phase:
- Build a local map of context/middleware conventions already locked in this packet.
- Capture naming and snippet defaults (`context.ts`, TypeBox-first + static types in-file, `typeBoxStandardSchema as std`).
2. WebSearch + FireCrawl phase:
- Collect official oRPC docs on context, middleware, contract-first, handler integration, and server-side clients.
- Collect official Inngest docs on `serve`, function context/steps, middleware lifecycle/injection, and tracing/instrumentation.
3. Source synthesis phase:
- Record source-to-claim mapping (what each source supports).
- Mark uncertain behavior as open questions with caveats.
4. Authoring phase:
- Write findings artifact from verified sources.
- Write one canonical full tutorial (`E2E_04`) with explicit host -> composition -> surface -> runtime wiring.

## Output Contract
`E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md` must include:
1. Real-world context scale (not toy single-param examples).
2. Package internal procedures/context/middleware.
3. API plugin boundary context/middleware with auth/role/network concerns.
4. Workflow trigger + Inngest runtime context/middleware relationship.
5. Explicit split semantics: `/api/workflows/*` trigger vs `/api/inngest` runtime ingress.
6. Middleware deduplication boundaries (run once vs per-procedure/per-run behavior).
7. Source-backed rationale section citing official docs.
8. Open questions when behavior is uncertain.

## Done Criteria
1. Research evidence is traceable and source-mapped.
2. New walkthrough is consistent with packet conventions and naming defaults.
3. No edits outside owned files.
4. No commit performed.
