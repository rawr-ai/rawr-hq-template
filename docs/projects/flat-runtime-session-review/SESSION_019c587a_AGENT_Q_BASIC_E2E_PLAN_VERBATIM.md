# SESSION_019c587a — Agent Q Basic E2E Plan (Verbatim)

## Mission
Author one full tutorial-style basic end-to-end walkthrough for:
1. a simple internal package,
2. an API boundary plugin that owns its contract and mostly wraps the package internal client,
3. explicit host/composition/runtime glue with no hidden steps.

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

## Hard Rules Carried Into Authoring
1. TypeBox-first contract and schema examples.
2. Preserve split semantics:
   - caller-trigger path semantics: `/api/workflows/...`
   - runtime ingress semantics: `/api/inngest`
3. No glue hand-waving: composition and mount wiring must be concrete.
4. Docs-only work; no runtime code edits.
5. Stay in Basic E2E walkthrough scope only.

## Work Plan
1. Extract locked policies and concrete route/composition patterns from the source packet.
2. Define one basic capability example with:
   - internal package default shape (`domain/ service/ procedures/ router.ts client.ts errors.ts index.ts`),
   - API plugin default shape (`contract.ts + operations/* + router.ts + index.ts`).
3. Encode one composition route and explicit mount points (`/rpc`, `/api/orpc`, `/api/inngest`) in the walkthrough.
4. Add 1-2 explicit endpoint divergences between package internals and boundary API contract.
5. Produce required sectioned final tutorial doc with runnable-style concrete code snippets.
6. Validate checklist against packet policy before finalizing.

## Required Artifacts
1. Plan (this file):
   - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_Q_BASIC_E2E_PLAN_VERBATIM.md`
2. Scratchpad:
   - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_Q_BASIC_E2E_SCRATCHPAD.md`
3. Final walkthrough:
   - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_01_BASIC_PACKAGE_PLUS_API_BOUNDARY.md`

## Done Criteria
1. All 9 required sections are present and complete.
2. Hosting mount path, package location, API plugin location, and composition route are explicit.
3. Endpoint divergence examples are concrete and policy-consistent.
4. Split semantics are explicit even in API-only scope.
5. Output is implementation-ready without inference.
