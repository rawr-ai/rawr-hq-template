# Agent E3 Plan (Verbatim)

## Assignment
- Agent: `E3`
- Owned example file only:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/examples/e2e-03-microfrontend-integration.md`
- Pass artifacts allowed:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_example-alignment-pass-01/AGENT_E3_PLAN_VERBATIM.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_example-alignment-pass-01/AGENT_E3_SCRATCHPAD.md`

## Mission
Realign E2E-03 to canonical policy with zero policy drift while preserving code-level specificity and example utility for MFE integration.

## Hard Constraints
1. Edit only owned example + E3 pass artifacts.
2. No runtime code changes.
3. No policy drift or semantic widening.
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
1. Keep MFE guidance authoritative for first-party default transport:
   - `/rpc` + `RPCLink` is default for first-party MFE.
2. Keep OpenAPI route usage explicit and exception-scoped:
   - `/api/orpc/*` and `/api/workflows/<capability>/*` for external/third-party,
   - first-party OpenAPI usage only by explicit documented exception.
3. Remove or correct policy-adjacent ambiguities:
   - workflow boundary I/O ownership,
   - route/mount ordering semantics,
   - caller/auth matrix language consistency.
4. Add `Conformance Anchors` section mapping major segments to canonical policy docs.

## Execution Steps
1. Build conformance delta map from current E2E-03 vs canonical axes/decisions.
2. Build detail-preservation ledger so useful snippets remain concrete.
3. Rewrite E2E-03 structure for clarity + policy traceability.
4. Add `Conformance Anchors` with section-to-policy mappings.
5. Perform four-pass self-check:
   - policy conformance,
   - contradiction scan,
   - detail preservation,
   - information-design clarity.
6. Finalize concise completion summary with residual risks.
