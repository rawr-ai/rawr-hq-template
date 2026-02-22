# SESSION_019c587a_AGENT_CORE_RESHAPE_EXEC — Scratchpad

## Setup Status
- Setup artifacts recreated in active area after archive cleanup.
- No target reshape outputs edited at setup stage.

## Mandatory Read Scope (completed)
- Skills: information-design, docs-architecture, architecture, deep-search, decision-logging.
- Full spec corpus: packet index, 9 axes, decisions, redistribution traceability, 4 E2E examples, posture spec.
- Reshape inputs: proposal, assessment, 3 reshape plans, Agent A review, Agent B review.

## Execution Guardrails
1. Owned output files only:
   - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime/README.md`
   - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime/ARCHITECTURE.md`
   - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime/DECISIONS.md`
2. Clarity/structure reshaping only; preserve policy meaning.
3. Canonical caller/auth matrix appears in ARCHITECTURE only.
4. D-005..D-010 decision meaning locked exactly.

## No-Drift Checklist
- [ ] No policy assertions added/removed relative to canonical packet + posture source.
- [ ] Decision IDs unchanged for D-005..D-010.
- [ ] Cross-references updated to new file layout only.
- [ ] Implementation-legible code snippets preserved where they carry normative/operational clarity.

## Implementation Decisions

### Preserve DECISIONS Register Verbatim
- **Context:** D-005..D-010 meaning must not drift.
- **Options:** (A) Rewrite DECISIONS into new structure, (B) Copy canonical register verbatim.
- **Choice:** B
- **Rationale:** Verbatim copy eliminates semantic reinterpretation risk for locked/open decision semantics.
- **Risk:** Low; path references remain legacy-style but meaning is preserved exactly.

### Keep Canonical Matrix Source in ARCHITECTURE Only
- **Context:** Authority consolidation requires one canonical caller/auth matrix source.
- **Options:** (A) Repeat full matrix in README, (B) Reference-only in README and define full matrix only in ARCHITECTURE.
- **Choice:** B
- **Rationale:** Meets canonical-source lock and avoids multi-source drift.
- **Risk:** Low; readers must follow README pointer to ARCHITECTURE for full table.

### Preserve Policy Language by Extraction-First Merge
- **Context:** ARCHITECTURE consolidation from posture + packet risks accidental restatement drift.
- **Options:** (A) Rewrite for brevity, (B) Preserve source wording and restructure sections only.
- **Choice:** B
- **Rationale:** No-drift lock favors structural reshaping over textual reinterpretation.
- **Risk:** Medium; document remains dense, but policy fidelity is retained.
