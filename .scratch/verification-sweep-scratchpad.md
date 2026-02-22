# Verification Sweep Scratchpad

Date: 2026-02-17
Scope: schema-helper consistency after rewrite

## Search Log

1. Ran repo-wide searches for:
   - `InputSchema|OutputSchema`
   - `TypeBox|Zod|zod`
   - inline-I/O wording (`inline`, `.input/.output`, paired `{ input, output }`)
2. Narrowed to canonical packet surfaces:
   - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`
   - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/DECISIONS.md`
   - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_01_BASIC_PACKAGE_PLUS_API_BOUNDARY.md`
   - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_02_API_PLUS_WORKFLOWS_COMPOSED_CAPABILITY.md`
   - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md`
   - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`
   - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`

## Findings

1. No active packet docs contained Zod-authored contract/procedure snippets; however, policy phrasing was weaker (`TypeBox-first`) than requested (`TypeBox-only stance`).
2. Inline-I/O rule existed in packet policy and E2E_01/E2E_02 checklists, but E2E_03/E2E_04 checklists did not explicitly include an inline-I/O checklist row.
3. `InputSchema`/`OutputSchema` mentions in active packet surfaces were policy-negative examples (prohibiting split top-level constants), not regressions.

## Candidate Fixes

1. Tighten packet + posture policy text from `TypeBox-first` to explicit `TypeBox-only contract/procedure schema authoring (no Zod-authored contract/procedure schemas)`.
2. Add explicit inline-I/O checklist rows to E2E_03 and E2E_04.
3. Align E2E_01/E2E_02 checklist and guardrail wording with the same TypeBox-only contract/procedure stance.

## Re-Verification Evidence

1. `rg -n "\\b(Zod|zod)\\b" docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet ...` after fixes returns only policy guardrail language (no Zod-authored snippets).
2. `rg -n "Inline-I/O default \\+ paired extraction shape|default to inline procedure/contract"` confirms inline-I/O checklist/policy text across packet + examples.
3. `rg -n "\\b(InputSchema|OutputSchema)\\b" docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet -g '*.md'` confirms only anti-pattern references remain.
