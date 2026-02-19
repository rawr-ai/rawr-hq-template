# Agent B Scratchpad

## Skill intake (mandatory)
- `information-design` (mandatory): enforce direct, structured, execution-ready docs language instead of advisory prose.
- `architecture`: keep this pass additive to locked subsystem posture and avoid policy redesign.
- `docs-architecture`: keep canonical authority inside packet docs and express external-doc updates as deferred directives only.
- `decision-logging`: record no-drift choices explicitly where language could be interpreted multiple ways.
- `deep-search`: verify corpus-wide consistency across axes/examples before patching owned docs.
- `orpc`: preserve route-family and caller-mode semantics (`/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*`).
- `inngest`: preserve runtime-ingress-only semantics and durable lifecycle constraints for `/api/inngest`.

## Corpus-read checkpoints
Read in full:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/README.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md`
- all files under `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/axes/`
- all files under `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/examples/`

## A/C/T alignment checkpoints
Read:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_expansion-pass-01/AGENT_A_SCRATCHPAD.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_expansion-pass-01/AGENT_C_SCRATCHPAD.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_expansion-pass-01/AGENT_T_SCRATCHPAD.md`

## No-drift anchors to preserve
1. D-005 route split: caller-facing workflow/API routes remain distinct from runtime ingress.
2. D-006 ownership split: plugin-owned boundary contracts; package-owned domain logic only.
3. D-007 transport/publication split: first-party default `/rpc`, external published OpenAPI, no caller `/api/inngest`.
4. D-008 bootstrap/mount order lock: traces baseline first, one runtime-owned Inngest bundle, explicit mount order.
5. D-011/D-012 context/schema ownership and inline-I/O defaults remain unchanged.
6. D-013 lifecycle obligations remain in force: `manifest-smoke`, `metadata-contract`, `import-boundary`, `host-composition-guard` downstream checks.
7. D-014 lock-ready direction remains in force: package-first shared harness/core primitives and one-way import direction.

## Adequacy gaps found in owned docs
1. `IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md` still contains non-executable phrasing in places (`at least`, conditional optionality, broad advisory checks).
2. Web/CLI/workflow/API lifecycle expectations are present but scattered; some directives are not strict enough to run as a checklist without interpretation.
3. Axis 05 and Axis 06 reference Axis 12 but can further tighten “must-assert” lifecycle verification obligations by surface.
4. E2E-04 has rich blueprint detail but lacks a compact copy-ready, pass/fail-oriented checklist block for direct downstream application.

## Decisions in this pass
### Decision 1: Strengthen directives without changing architecture posture
- **Context:** Need stronger adequacy while preserving A/C/T policy locks.
- **Options:**
  - A) Add new policy sections in unrelated files.
  - B) Tighten language only in owned files and cross-link to existing canonical axes.
- **Choice:** B.
- **Rationale:** Meets ownership boundary and avoids policy churn.
- **Risk:** Over-constraining wording; mitigated by anchoring every addition to existing D-005..D-014 semantics.

### Decision 2: Convert future-update spec from advisory to executable contract
- **Context:** Acceptance gate requires no hand-wavy language.
- **Options:**
  - A) Minor edits to existing directives.
  - B) Rewrite directives into strict target/section/required-content/acceptance-check format.
- **Choice:** B.
- **Rationale:** Produces direct downstream usability.
- **Risk:** Longer doc; mitigated by keeping sections compact and tabular where possible.

### Decision 3: Add explicit lifecycle verification checklists in 05/06/e2e-04
- **Context:** Need explicit web/CLI/workflow/API expectations.
- **Options:**
  - A) Keep only Axis 12 link-outs.
  - B) Add concrete per-surface assertions and negative tests in owned docs.
- **Choice:** B.
- **Rationale:** Removes ambiguity without modifying underlying architecture policy.
- **Risk:** Duplication with Axis 12; mitigated by concise cross-reference language and scoped additions.

## Execution log
1. Updated `axes/05-errors-observability.md` with lifecycle-ready surface requirements and D-013/D-014 compatibility checks.
2. Updated `axes/06-middleware.md` with explicit surface-specific middleware lifecycle expectations and compatibility checks.
3. Updated `examples/e2e-04-context-middleware.md` with copy-ready acceptance checklist + mandatory suite IDs for downstream tracking.
4. Rewrote `IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md` into explicit target/heading/content/acceptance contracts and removed hand-wavy phrasing.
