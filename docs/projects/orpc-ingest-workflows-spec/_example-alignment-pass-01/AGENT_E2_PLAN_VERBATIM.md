# Agent E2 Plan (Verbatim)

## Assignment
- Agent: `E2`
- Owned example file only:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/examples/e2e-02-api-workflows-composed.md`
- Pass artifacts allowed:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_example-alignment-pass-01/AGENT_E2_PLAN_VERBATIM.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_example-alignment-pass-01/AGENT_E2_SCRATCHPAD.md`

## Mission
Realign E2E-02 to canonical policy with zero policy drift while preserving code-level specificity for API + workflow composition and manifest-driven host wiring.

## Hard Constraints
1. Edit only owned example + E2 pass artifacts.
2. No runtime code changes.
3. No policy drift.
4. Draft-first: complete reasoning in scratchpad before editing owned example.

## Mandatory Grounding Checklist (Completed Before Edit)
1. Skills introspected and applied:
   - `information-design`
   - `orpc`
   - `architecture`
   - `typescript`
   - `inngest`
   - `docs-architecture`
   - `decision-logging`
   - `system-design` (explicit literal skill)
   - `api-design` (explicit literal skill)
   - `typebox` (explicit literal skill)
2. Canonical corpus fully read:
   - `README.md`
   - `ARCHITECTURE.md`
   - `DECISIONS.md`
   - `CANONICAL_EXPANSION_NAV.md`
   - `IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md`
   - all `axes/*.md`
   - all `examples/*.md`

## Rewrite Objectives
1. Preserve the example’s core purpose: one capability composed across API boundary, workflow trigger boundary, and durable runtime.
2. Restore strict caller-mode semantics:
   - first-party default `/rpc` via `RPCLink`,
   - external publication on `/api/orpc/*` and `/api/workflows/<capability>/*`,
   - `/api/inngest` runtime-ingress-only.
3. Make manifest-driven wiring explicit and canonical:
   - `rawr.hq.ts` as composition authority,
   - host mount/control-plane order explicit (`/api/inngest` -> `/api/workflows/*` -> `/rpc` + `/api/orpc/*`).
4. Add explicit context injection seams:
   - host context factory modules,
   - boundary/workflow context contracts,
   - injected package client + Inngest bundle usage.
5. Add `Conformance Anchors` section mapping major example segments to canonical policy docs.

## Execution Steps
1. Write E2 artifacts first:
   - `AGENT_E2_PLAN_VERBATIM.md` (this file)
   - `AGENT_E2_SCRATCHPAD.md` (skills notes + conformance map + detail ledger + self-check)
2. Rewrite `e2e-02-api-workflows-composed.md` with canonical route/ownership/context semantics while preserving concrete snippets.
3. Keep high-detail code samples for package, API plugin, workflow plugin, manifest composition, and host registration.
4. Add dedicated `Conformance Anchors` table with section-to-policy mapping.
5. Run post-edit four-pass self-check and finalize with concise completion summary + residual risks.

## Decision-Logging Note
Any interpretation choice with potential policy impact is recorded in the E2 scratchpad before and after edit execution.
