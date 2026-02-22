# SESSION_019c587a — Agent Steward Reshape Exec Plan (Verbatim)

## Mission
Independently verify reshape correctness and no-drift compliance for `docs/projects/flat-runtime/**`, applying only minimal safe fixes if strictly required by gate failures.

## Fixed Gates
1. No policy/spec drift vs source corpus (D-005..D-010 semantics intact).
2. Decision IDs unchanged except valid unused ID allocation if any.
3. Canonical caller/auth matrix authority appears in one place only.
4. No required example code/snippets dropped.
5. No stale references in active canonical docs.
6. Clear canonical read path for implementation-planning agents.

## Inputs (Mandatory)
- Skills:
  - `/Users/mateicanavra/.codex-rawr/skills/information-design/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/docs-architecture/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/architecture/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/deep-search/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/decision-logging/SKILL.md`
- Official source corpus:
  - `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/*.md`
  - `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/*.md`
  - `docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
  - `docs/projects/flat-runtime-session-review/RESHAPE_PROPOSAL.md`
  - `docs/projects/flat-runtime-session-review/CANONICAL_ASSESSMENT.md`
- Reshaped outputs:
  - `docs/projects/flat-runtime/**`
- Integration artifacts:
  - `docs/projects/flat-runtime/RESHAPE_SNIPPET_PARITY_MAP.yaml`
  - `docs/projects/flat-runtime/RESHAPE_LINK_MIGRATION_REPORT.md`
  - `docs/projects/flat-runtime/RESHAPE_INTEGRATION_CHANGELOG.md`

## Execution Plan
1. Confirm workspace and VCS context (branch, status, Graphite availability) without altering existing unrelated changes.
2. Perform full-file corpus sweep over source and reshaped outputs (line counts + SHA256 inventory) to ensure complete-read coverage.
3. Validate D-005..D-010 semantics by normalized section comparison between source and reshaped `DECISIONS.md`.
4. Validate decision-ID set parity by comparing heading IDs in source vs reshaped `DECISIONS.md`.
5. Validate canonical caller/auth matrix authority uniqueness by searching canonical packet docs for authority claims and canonical-source declarations.
6. Validate snippet preservation with independent fenced-block hash inclusion checks per source->destination map.
7. Validate stale-reference gates by searching canonical docs (and integration-touched global docs) for legacy session-review/orpc-ingest-spec-packet pointers.
8. Validate implementation-planning read path clarity in `README.md` and `ARCHITECTURE.md`.
9. Apply minimal safe fixes only if a gate fails.
10. Produce final steward verdict in `docs/projects/flat-runtime/RESHAPE_FINAL_STEWARD_REVIEW.md` with explicit PASS/FAIL and evidence paths.

## Decision Logging Policy For This Steward Pass
- Any ambiguity affecting gate interpretation is recorded immediately in the scratchpad.
- No policy edits are made unless gate failure requires corrective action.
- If all gates pass, emit explicit readiness declaration for implementation-planning phase.
