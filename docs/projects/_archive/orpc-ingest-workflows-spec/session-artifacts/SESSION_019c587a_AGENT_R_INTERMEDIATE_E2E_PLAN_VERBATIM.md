# SESSION_019c587a — Agent R Intermediate E2E Plan (Verbatim)

## Mission
Author the intermediate end-to-end walkthrough doc for one composed capability where:
1. API surface calls an internal package client.
2. Workflow trigger surface calls an internal package client and enqueues durable execution with Inngest.
3. Both surfaces are composed through `rawr.hq.ts` and mounted explicitly in the server host layer.

## Ownership
- Docs-only authoring for intermediate walkthrough artifacts.
- No runtime/package/plugin code edits.
- Ignore unrelated local edits outside owned docs paths.

## Required Inputs
1. Skill grounding:
   - `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
   - `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md`
   - `/Users/mateicanavra/.codex-rawr/skills/elysia/SKILL.md`
   - `/Users/mateicanavra/.codex-rawr/skills/typebox/SKILL.md`
   - `/Users/mateicanavra/.codex-rawr/skills/architecture/SKILL.md`
2. Context packet:
   - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_E2E_WALKTHROUGHS_AGENT_CONTEXT_PACKET.md`
3. Canonical source set from that packet:
   - `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
   - `ORPC_INGEST_SPEC_PACKET.md`
   - `AXIS_01` through `AXIS_09`
   - `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md`

## Hard Constraints
1. TypeBox-first schema posture.
2. Split harness posture is explicit and preserved.
3. `/api/workflows/...` is caller trigger path, `/api/inngest` is runtime ingress.
4. No plugin-to-plugin direct coupling.
5. No black-box composition glue.
6. Docs-only (no runtime implementation changes).

## Required Artifacts
1. Plan (this file):
   - `docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_R_INTERMEDIATE_E2E_PLAN_VERBATIM.md`
2. Scratchpad:
   - `docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_R_INTERMEDIATE_E2E_SCRATCHPAD.md`
3. Final walkthrough:
   - `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_02_API_PLUS_WORKFLOWS_COMPOSED_CAPABILITY.md`

## Walkthrough Output Contract
The final walkthrough must include:
1. Goal/use-case framing.
2. End-to-end topology diagram.
3. Canonical file tree.
4. Key files with concrete code.
5. Wiring steps from host -> composition -> plugin/package -> runtime.
6. Runtime sequence walkthrough.
7. Rationale and trade-offs.
8. Failure modes + guardrails.
9. Explicit policy consistency checklist.

## Execution Plan
1. Extract locked policies and naming from the packet + axis docs.
2. Select one concrete capability example consistent with recommendation defaults.
3. Build a full file topology using package + API plugin + workflow plugin + composition + host mounts.
4. Write concrete TypeBox-first snippets for package client, API operations, workflow operations, and Inngest function.
5. Show explicit `rawr.hq.ts` composition and server mounting split.
6. Add walkthrough flow, trade-offs, risks, and checklist validation.
7. Verify consistency with all locked posture constraints.

## Done Criteria
1. Reader can implement the capability from the doc without external interpretation.
2. Trigger and runtime ingress semantics are unambiguous and non-overlapping.
3. Internal-client default and split posture are obvious in code and text.
4. No section hand-waves composition/mounting glue.
