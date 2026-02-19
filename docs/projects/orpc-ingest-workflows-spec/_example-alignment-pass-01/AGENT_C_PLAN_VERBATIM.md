# Agent C Plan (Verbatim)

## Role
Agent C = consistency checker for Example Alignment Pass.

## Mission (verbatim intent)
- Do an exhaustive, document-by-document cross-check for contradictions across canonical docs + examples, with emphasis on D-005..D-015, route semantics, ownership, and injection boundaries.
- Validate that examples are fully aligned and that any example-only critical policy gaps are promoted into canonical docs first.

## Phasing Contract
1. Immediately perform grounding, planning artifacts, and initial scan notes.
2. STOP and wait for explicit message: `GO_FINAL_CONSISTENCY_PASS`.
3. After GO, run final pass and apply only minimal safe corrections needed for consistency.

## Hard Gates to Enforce
1. No contradiction with `ARCHITECTURE.md` caller/auth matrix.
2. No package-owned workflow boundary implication.
3. No caller traffic examples on `/api/inngest`.
4. D-014 host adapter ownership/injection semantics intact.
5. D-013 metadata semantics intact.
6. D-015 testing semantics aligned where examples discuss testing.
7. `Conformance Anchors` section exists in each example.
8. No loss of critical details/code snippets.

## Mandatory Grounding (completed before edits)
Required skills loaded and applied:
- `information-design` (`/Users/mateicanavra/.codex-rawr/skills/information-design/SKILL.md`) - loaded.
- `orpc` (`/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`) - loaded.
- `architecture` (`/Users/mateicanavra/.codex-rawr/skills/architecture/SKILL.md`) - loaded.
- `typescript` (`/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`) - loaded.
- `inngest` (`/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md`) - loaded.
- `docs-architecture` (`/Users/mateicanavra/.codex-rawr/skills/docs-architecture/SKILL.md`) - loaded.
- `decision-logging` (`/Users/mateicanavra/.codex-rawr/skills/decision-logging/SKILL.md`) - loaded.
- `system-design` (`/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md`) - loaded.
- `api-design` (`/Users/mateicanavra/.codex-rawr/skills/api-design/SKILL.md`) - loaded.
- `typebox` (`/Users/mateicanavra/.codex-rawr/skills/typebox/SKILL.md`) - loaded.

Missing skill fallback status:
- None. No fallback substitutions needed.

## Corpus Read Scope (completed)
Canonical docs:
- `README.md`
- `ARCHITECTURE.md`
- `DECISIONS.md`
- `CANONICAL_EXPANSION_NAV.md`
- `IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md`

Axes docs:
- `axes/01-external-client-generation.md`
- `axes/02-internal-clients.md`
- `axes/03-split-vs-collapse.md`
- `axes/04-context-propagation.md`
- `axes/05-errors-observability.md`
- `axes/06-middleware.md`
- `axes/07-host-composition.md`
- `axes/08-workflow-api-boundaries.md`
- `axes/09-durable-endpoints.md`
- `axes/10-legacy-metadata-and-lifecycle-simplification.md`
- `axes/11-core-infrastructure-packaging-and-composition-guarantees.md`
- `axes/12-testing-harness-and-verification-strategy.md`

Examples docs:
- `examples/e2e-01-basic-package-api.md`
- `examples/e2e-02-api-workflows-composed.md`
- `examples/e2e-03-microfrontend-integration.md`
- `examples/e2e-04-context-middleware.md`

Read artifact checksum:
- `/tmp/agent_c_full_corpus_read.log`
- SHA256: `033f37c53bd8cce5e1917170bf49151823cfd6d4aee31316d171dba0fb651b1e`

## Initial Consistency Scan Summary (pre-GO)
- Gate 1 (matrix contradiction): no direct contradictions found in canonical docs; one example clarity risk to verify in final pass (`e2e-02` host snippet omits explicit `/rpc` mount context).
- Gate 2 (package-owned workflow boundary implication): no direct violations found; plugin-owned boundary language is present.
- Gate 3 (no caller traffic examples on `/api/inngest`): likely violation in `e2e-04` negative test snippet showing browser fetch to `/api/inngest`.
- Gate 4 (D-014 injection semantics): broadly intact; a few `as any` placeholders in examples create clarity risk but not clear policy inversion.
- Gate 5 (D-013 metadata semantics): intact where referenced; no legacy metadata runtime-driving language found in examples.
- Gate 6 (D-015 testing semantics): largely aligned in `e2e-04`; needs final strict check against Gate 3 interpretation.
- Gate 7 (`Conformance Anchors` section in each example): missing in all four examples.
- Gate 8 (no loss of critical details/snippets): no edits made yet; preserve-by-default plan for final minimal corrections.

## Final Pass Execution Plan (blocked until GO)
1. Build final contradiction matrix with per-file pass/fail and line-cited evidence.
2. Apply minimal safe edits only for hard-gate failures.
3. Preserve all existing critical code snippets and policy details.
4. Re-run gate checks after edits.
5. Produce final report file:
   - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_example-alignment-pass-01/FINAL_EXAMPLE_ALIGNMENT_REPORT.md`

## Stop Condition (active)
No final consistency edits will be applied until explicit user signal:
- `GO_FINAL_CONSISTENCY_PASS`
