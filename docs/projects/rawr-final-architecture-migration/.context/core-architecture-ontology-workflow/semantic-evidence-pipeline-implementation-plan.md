# Semantic Evidence Comparison Pipeline Plan

## Summary

Build a real document comparison pipeline that uses the reviewed RAWR ontology as truth, Semantica as the extraction/graph/export/query substrate, and a source-backed evidence ledger as the bridge between documents and ontology constraints.

The current `doc:diff` must be treated as lexical triage, not semantic validation. The new system must not emit decision-grade findings from raw phrase matches. A finding must come from a parsed claim with provenance, polarity, modality, scope, resolution, and a rule/constraint explanation.

Current baseline:
- Active branch/worktree: `codex/semantic-diff-reframe-docs` in `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-semantic-diff-reframe-docs`
- Current docs-only commit: `200b602a`
- Active reframe doc: `docs/projects/rawr-final-architecture-migration/.context/core-architecture-ontology-workflow/semantic-diff-reframe-draft.md`
- Superseded lexical proof-run docs are already archived.

## Team Model

Use a fresh phase-scoped team. Codex remains DRI and owns final synthesis.

Team roles:
- Semantica capability owner: proves what pinned Semantica can actually do.
- Ontology model owner: fixes ontology/evidence/candidate/constraint boundaries.
- Evidence extraction owner: designs document claim extraction with polarity/modality.
- Resolution and inference owner: maps claims to ontology IDs and emits verdicts.
- Workbench engineer: implements CLI/data artifacts without broad rewrites.
- Viewer/query owner: keeps Cytoscape, JSON queries, RDF/SPARQL useful.
- Verification owner: owns adversarial fixtures, final-spec regression, and phase gates.

Agent rules:
- Every agent gets the same framing: Semantica is substrate, reviewed ontology governs truth, evidence is not canonical, no raw forbidden phrase verdicts.
- Use default/high-capability agents for semantic decisions.
- Use explorer agents only for raw facts.
- Close agents after each phase so stale assumptions do not carry forward.

## Phase 0: Plan Capture And Branch Grounding

First implementation action:
- Create a stacked Graphite branch above `codex/semantic-diff-reframe-docs`, e.g. `codex/semantic-evidence-comparison`.
- Write this implementation plan to `docs/projects/rawr-final-architecture-migration/.context/core-architecture-ontology-workflow/semantic-evidence-pipeline-implementation-plan.md`.
- Write the orchestrator workflow to `docs/projects/rawr-final-architecture-migration/.context/core-architecture-ontology-workflow/semantic-evidence-pipeline-orchestrator-workflow.md`.

Verification loop:
- Confirm Graphite stack and clean worktree before edits.
- Confirm no source specs are modified.
- Confirm existing archived proof-run docs stay archived.

Artifact:
- Tracked implementation plan and orchestrator workflow.

## Phase 1: Semantica Capability Proof

Squeeze Semantica first before custom-building.

Investigate and run small proofs for:
- `semantica.semantic_extract`: `NERExtractor`, `RelationExtractor`, `TripletExtractor`, `SemanticNetworkExtractor`, `LLMExtraction`.
- `semantica.ontology`: `OntologyEngine.from_data`, `from_text`, `to_owl`, `to_shacl`, `validate_graph`.
- `semantica.reasoning`: SPARQL/Rete/Datalog usefulness on tiny RAWR fixtures.
- `semantica.conflicts` and provenance/source tracking for review-grade findings.
- Existing RDFLib SPARQL path as reliable fallback.

Proof cases:
- “There is no root-level `core/` authoring root.” => aligned rejection.
- “Create a root-level `core/` authoring root.” => conflict.
- Historical mention of forbidden pattern => informational/review-needed.
- Deprecated term in replacement table => not conflict.
- Ambiguous mention => ambiguous.

Verification loop:
- Record exact Semantica version, pinned commit, available optional deps, and API limitations.
- Compare Semantica extraction against current schema extraction.
- Reject any Semantica surface that loses line spans or canonical IDs.

Artifact:
- `semantic-evidence-semantica-capability-report.md`
- Fixture outputs under ignored `.semantica/`

## Phase 2: Ontology Boundary Cleanup

Keep YAML only as a reviewed authoring surface. It is acceptable if it compiles into typed JSON/RDF/SHACL and does not force string-blob reasoning.

Implement ontology/data model changes:
- Separate canonical concepts, accepted aliases, deprecated vocabulary, prohibited construction patterns, replacement rules, evidence claims, review findings, and candidate queue.
- Split vocabulary deprecation from construction prohibition.
- Replace phrase-like `ForbiddenPattern` semantics with structured prohibited construction constraints.
- Keep candidates out of canonical graph views unless reviewed/promoted.

Verification loop:
- Schema rejects unknown predicates and string-only constraints for decision-grade rules.
- Every locked ontology fact has source refs and operational consequence.
- Deprecated terms and prohibited construction paths can be queried separately.

Artifact:
- Updated ontology contract/layers.
- Validation report proving canonical/evidence/candidate separation.

## Phase 3: Evidence Claim Extraction

Add a comparison-document evidence pipeline.

Tracked inputs:
- Evidence claim schema.
- Extraction prompt/schema for LLM/Semantica-assisted extraction.
- Deterministic fixture corpus.

Evidence claim fields:
- `id`, `source_path`, `line_start`, `line_end`, `heading_path`, `text`
- `subject`, `predicate`, `object`
- `polarity`: positive, negative, prohibitive, conditional, unknown
- `modality`: normative, descriptive, proposed, rejected, historical, illustrative, unknown
- `assertion_scope`: target-architecture, current-state, migration-note, example, outside-scope, unknown
- `authority_context`, `confidence`, `extractor`, `model`, `resolved_ids`, `review_state`

Commands:
- Add `semantica:doc:extract`
- Produce `.semantica/runs/<id>/document-chunks.jsonl`
- Produce `.semantica/runs/<id>/evidence-claims.jsonl`

Verification loop:
- Every claim has exact source span.
- Missing polarity/modality/scope downgrades to non-decision-grade.
- No extracted entity is promoted to canonical truth.
- Fixture mode works without `OPENAI_API_KEY`.

Artifact:
- Evidence claim schema, prompts, extractor, fixtures, and extraction report.

## Phase 4: Resolution And Constraint Inference

Add semantic comparison over extracted claims.

Resolution targets:
- Canonical entities and accepted aliases.
- Deprecated vocabulary IDs.
- Prohibited construction pattern IDs.
- Replacement rules.
- Candidate queue entries.
- Outside-scope buckets.

Verdict rules:
- Positive/proposed target claim asserts prohibited construction => `conflict`.
- Negative/prohibitive claim rejects prohibited construction => `aligned`.
- Positive claim asserts locked canonical fact => `aligned`.
- Target/normative claim uses deprecated vocabulary as architecture truth => `deprecated-use`.
- Deprecated term in migration/replacement/historical context => informational or aligned.
- In-scope unresolved concept with operational consequence => `candidate-new`.
- Low-confidence/partial resolution => `ambiguous`.
- Procedural or out-of-scope material => `outside-scope`.

Commands:
- Add `semantica:doc:compare`
- Keep lexical behavior as `semantica:doc:triage`
- Make `semantica:doc:diff -- --mode semantic` use the new path once fixtures pass.

Verification loop:
- No `conflict` can be emitted from raw text alone.
- Every finding cites claim, source span, resolved ontology target, and rule applied.
- The known negated final-spec false positive is eliminated.

Artifact:
- `.semantica/runs/<id>/resolved-evidence.json`
- `.semantica/runs/<id>/semantic-compare.json`
- `.semantica/runs/<id>/semantic-compare-report.md`

## Phase 5: Reports, Queries, Viewer, RDF/SPARQL

Update inspection surfaces without turning them into truth.

Changes:
- Cytoscape overlays distinguish canonical ontology, evidence claims, candidates, and findings.
- Add named queries: `semantic-conflicts`, `aligned-rejections`, `deprecated-uses`, `ambiguous-claims`, `candidate-new`, `source-coverage`.
- Export evidence/finding graph to RDF/Turtle while keeping canonical ontology graph separate.
- Keep SPARQL over generated TTL available for agents.
- Record Semantica status/version/errors in run metadata.

Verification loop:
- Viewer does not collapse evidence/candidates into canonical truth.
- RDF/SPARQL preserves canonical IDs and finding provenance.
- Named queries return review-useful answers, not only counts.

Artifact:
- Updated viewer/query/export outputs under `.semantica/current/`
- Tracked query examples and docs.

## Phase 6: Regression And Final Verification

Run required checks:
- `bun run semantica:setup`
- `bun run semantica:check`
- `bun run semantica:core:validate`
- `bun run semantica:core:build`
- `bun run semantica:core:export`
- `bun run semantica:doc:triage -- --document <fixture>`
- `bun run semantica:doc:extract -- --fixture`
- `bun run semantica:doc:compare -- --fixture`
- Semantic compare against both finalized specs.
- Semantic compare against the testing plan.
- Python unit tests for `tools/semantica-workbench`
- `git diff --check`
- `git check-ignore .semantica/current/semantic-compare-report.md`

Acceptance criteria:
- All adversarial fixtures pass.
- Final specs have zero false forbidden/conflict findings from negated/prohibitive text.
- Every decision-grade finding has source span, extracted claim, resolved ID, rule, and confidence.
- Ambiguous cases remain ambiguous instead of being forced into conflict.
- YAML remains authoring-only; JSON/RDF/SHACL/queries are derived graph surfaces.
- Worktree is clean after Graphite commit.

Commit:
- Use Graphite.
- Commit message: `feat(tools): add semantic evidence document comparison`

## Assumptions

- Do not push or open PR unless explicitly asked.
- Do not modify finalized source specs.
- Do not delete archived proof-run docs.
- Current lexical `doc:diff` is preserved only as triage/compatibility until semantic mode is verified.
- Semantica official surfaces used as planning references: [GitHub README](https://github.com/Hawksight-AI/semantica), [docs home](https://hawksight-ai.github.io/semantica/), [cookbook](https://hawksight-ai.github.io/semantica/cookbook/), and [ingest docs](https://hawksight-ai.github.io/semantica/reference/ingest/).

Skills used: team-design.
