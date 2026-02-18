# Agent B Plan (Verbatim)

## Role and ownership
- Role: Agent B (Testing/Docs/Lifecycle Cross-Functional Booster).
- Canonical edit boundary:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/axes/05-errors-observability.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/axes/06-middleware.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/examples/e2e-04-context-middleware.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md`
- Mandatory expansion-pass artifacts to create:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_expansion-pass-01/AGENT_B_PLAN_VERBATIM.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_expansion-pass-01/AGENT_B_SCRATCHPAD.md`

## Guardrails
- Preserve D-005..D-012 semantics.
- Stay compatible with D-013 and D-014 lock-ready additions already introduced in packet docs.
- No runtime code edits.
- Do not edit process/runbook/testing docs outside this packet.
- Ignore unrelated collaborator edits and never revert them.

## Mandatory setup checklist
1. Skill intake recorded in scratchpad:
   - `information-design` (mandatory)
   - `architecture`
   - `docs-architecture`
   - `decision-logging`
   - `deep-search`
   - `orpc`
   - `inngest`
2. Full canonical packet corpus read:
   - `README.md`
   - `ARCHITECTURE.md`
   - `DECISIONS.md`
   - all `axes/*.md`
   - all `examples/*.md`
3. Cross-agent artifacts read:
   - `AGENT_A_SCRATCHPAD.md`
   - `AGENT_C_SCRATCHPAD.md`
   - `AGENT_T_SCRATCHPAD.md`
4. Expansion-pass artifacts created before conclusions:
   - `AGENT_B_PLAN_VERBATIM.md`
   - `AGENT_B_SCRATCHPAD.md`

## Mission outcomes
1. Strengthen adequacy where current testing/docs/lifecycle directives are underspecified, without redesigning policy.
2. Make web/CLI/workflow/API lifecycle expectations explicit and directly actionable.
3. Remove hand-wavy language from implementation-adjacent future updates spec.
4. Keep D-013 metadata/lifecycle obligations and D-014 package-first/import-direction guarantees coherent with Axis 12 test-harness policy.

## Edit execution plan
1. Capture findings, ambiguity decisions, and no-drift anchors in `AGENT_B_SCRATCHPAD.md`.
2. Patch `axes/05-errors-observability.md` with explicit lifecycle observability verification expectations by surface and route family.
3. Patch `axes/06-middleware.md` with explicit middleware lifecycle verification requirements and import-direction/package-first harness expectations.
4. Patch `examples/e2e-04-context-middleware.md` with a copy-ready execution checklist and hard acceptance criteria for web/CLI/API/workflow/runtime suites.
5. Rewrite `IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md` into explicit downstream directives with exact target docs, required section content, mandatory negative tests, and CI/doc gate checks.
6. Validate consistency against D-005..D-014 and provide concise completion report with exact files and rationale.
