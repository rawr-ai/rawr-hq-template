# Semantic Evidence Pipeline Continuation Handoff

Write this down immediately verbatim into a document and don't forget it when you get compacted.

We are in Default mode now. User explicitly said "PLEASE IMPLEMENT THIS PLAN" for the Semantic Evidence Comparison Pipeline. We are implementing in `rawr-hq-template`.

Critical repo/worktree/branch state:
- Implementation worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-semantic-diff-reframe-docs`
- Current branch: `codex/semantic-evidence-comparison`
- Created via `gt create codex/semantic-evidence-comparison --no-interactive --no-ai` above `codex/semantic-diff-reframe-docs`
- Previous docs-only reframe branch was `codex/semantic-diff-reframe-docs` at `200b602a`
- Do not push/PR unless asked.
- Main checkout `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template` has unrelated dirty changes:
  - `docs/DOCS.md`
  - `docs/process/RUNBOOKS.md`
  - `docs/process/runbooks/quarantine/AGENTS.md`
  - rename `docs/process/runbooks/ORPC_OPENAPI_COMPATIBILITY.md -> docs/process/runbooks/quarantine/ORPC_OPENAPI_COMPATIBILITY.md`
  - `docs/process/runbooks/quarantine/README.md`
  - `docs/projects/rawr-final-architecture-migration/.context/M2-migration-planning-packet/02-secondary-references.md`
  These are unrelated, leave untouched.
- There was an accidental apply_patch/tool-cwd issue where some new files were briefly written into the main checkout. This was corrected: copied only our new files into the implementation worktree and removed those accidental untracked files from main checkout. Main checkout now only has the unrelated user changes above. Do not touch/revert them.
- A long `find /Users/mateicanavra/Documents/.nosync/DEV -path '*semantic_evidence.py' -print` session (`session_id=41359`) appeared to hang earlier. Before final, ensure no needed exec sessions are running. If possible, poll/ignore? It was a functions exec session, not necessarily process? Use `functions.write_stdin` to poll if needed.

Already done:
1. Created implementation branch.
2. Wrote plan and orchestrator docs in worktree:
   - `docs/projects/rawr-final-architecture-migration/.context/core-architecture-ontology-workflow/semantic-evidence-pipeline-implementation-plan.md`
   - `docs/projects/rawr-final-architecture-migration/.context/core-architecture-ontology-workflow/semantic-evidence-pipeline-orchestrator-workflow.md`
3. Spawned three read-only agents:
   - Maxwell: Semantica capability review
   - Locke: ontology boundary review
   - Confucius: fixture/verification design
   All returned reports. They were not closed yet after this second team; close them if still open:
   - `019dcdb7-f542-72d0-9104-4a76ffdbf99a`
   - `019dcdb7-f5b0-7241-b2d5-f02888454abe`
   - `019dcdb7-f66b-7ed3-aa9c-5743b06ba4db`
4. Implemented new semantic evidence pipeline pieces:
   - New module: `tools/semantica-workbench/src/semantica_workbench/semantic_evidence.py`
   - New prompt: `tools/semantica-workbench/prompts/semantic-evidence-extraction.md`
   - New fixture doc: `tools/semantica-workbench/fixtures/docs/semantic-evidence-cases.md`
   - New expected fixture JSON: `tools/semantica-workbench/fixtures/semantic-evidence-expected.json`
   - New SPARQL example: `tools/semantica-workbench/queries/semantic-findings.rq`
5. CLI additions in `tools/semantica-workbench/src/semantica_workbench/cli.py`:
   - `doc:triage` for legacy lexical path
   - `doc:extract`
   - `doc:compare`
   - `semantic:capability`
   - `doc:diff --mode semantic` routes to semantic comparison; default still lexical
6. Root `package.json` scripts added:
   - `semantica:doc:triage`
   - `semantica:doc:extract`
   - `semantica:doc:compare`
   - `semantica:semantic:capability`
7. `tools/semantica-workbench/src/semantica_workbench/core_config.py` updated:
   - semantic artifact filenames:
     - `semantic_capability`
     - `semantic_capability_report`
     - `document_chunks`
     - `evidence_claims`
     - `evidence_claims_json`
     - `resolved_evidence`
     - `semantic_compare`
     - `semantic_compare_report`
     - `semantic_evidence_ttl`
   - named query descriptions:
     - `semantic-conflicts`
     - `aligned-rejections`
     - `deprecated-uses`
     - `ambiguous-claims`
     - `candidate-new`
   - removed `DIFF_SUMMARY` constant after noticing `doc:triage` regenerated archived proof-run doc path.
8. `tools/semantica-workbench/src/semantica_workbench/core_ontology.py` updated:
   - imports new semantic evidence helpers
   - adds `write_semantica_capability_report`
   - adds `extract_document_evidence`
   - adds `compare_document_evidence`
   - `extract_document_evidence` falls back to `TESTING_PLAN` if explicit missing `RAWR_Canonical_Testing_Plan.md` path is passed and quarantine default exists
   - `diff_document_against_core_ontology` no longer writes tracked `phase-4-testing-plan-diff-verification.md` (important: old proof-run docs remain archived only)
   - `visualize_core_ontology` prefers semantic compare overlay if present
   - validation now errors if `ForbiddenPattern` lacks structured `constraint.kind`, `constraint.prohibited_action`, and `constraint.terms/semantic_keys`
   - `build_graph_payload` now adds:
     - `target_architecture_view`
     - `constraint_overlay`
     - `vocabulary_overlay`
9. Ontology YAML updates:
   - `ontology-contract-v1.yaml`
     - added `target_architecture_view_statuses: [locked]`
     - added `target_architecture_excluded_types: DeprecatedTerm, EvidenceClaim, ForbiddenPattern, ReviewFinding, CandidateEntity`
     - changed `forbids` operational meaning to invalid construction paths, not stale terminology
   - `core-architecture-ontology-v1.yaml`
     - added structured `constraint` blocks to all core `ForbiddenPattern` entries:
       - `forbidden.pattern.root-core-authoring-root`
       - `forbidden.pattern.root-runtime-authoring-root`
       - `forbidden.pattern.superseded-sdk-package-name`
       - `forbidden.pattern.role-specific-public-start-verb`
       - `forbidden.pattern.plugin-projection-reclassification-field`
       - `forbidden.pattern.plugin-app-import-service-internals`
       - `forbidden.pattern.shared-table-write-authority-by-accident`
       - `forbidden.pattern.profile-field-resources-for-provider-selection`
       - `forbidden.pattern.async-plugin-public-product-api`
   - `runtime-realization-overlay-v1.yaml`
     - added structured `constraint` blocks to:
       - `forbidden.pattern.pre-provisioning-live-value-acquisition`
       - `forbidden.pattern.local-http-self-call-same-process`
10. Query/viewer updates:
   - `core_query.py`
     - loads semantic compare output for new named queries
     - SPARQL now loads both `semantica-data-graph.ttl` and `semantic-evidence.ttl` if available
   - `core_viewer.py`
     - semantic compare findings added to overlays/payload
   - `viewer/graph-viewer.js`
     - "Testing Plan Diff" preset relabeled "Semantic Evidence"
     - recognizes `conflict`, `deprecated_use`, `ambiguous`, `candidate_new` overlays
     - details panel lists related semantic findings for selected entity
11. README updated:
   - new commands
   - lexical triage is explicitly non-decision-grade
   - semantic evidence path explained
   - phrase match alone must not create decision-grade finding
12. Tests updated in `tools/semantica-workbench/tests/test_workbench.py`:
   - target view excludes constraints/candidates
   - forbidden patterns have structured constraints
   - semantic capability probe records Semantica surface
   - fixture verdict tests
   - opposite claims do not collapse
   - decision-grade semantic findings have source/polarity/modality/scope/entity

Important implementation behavior:
- `semantic_evidence.py` uses deterministic heuristic claim extraction:
  - tracks source path, line span, heading path, text, subject/predicate/object, polarity, modality, assertion_scope, authority_context, confidence, extractor, model, resolved IDs, review_state.
  - `semantic_capability_probe()` imports Semantica modules and runs small TripletExtractor/OntologyEngine probes. It records Semantica as substrate, not truth.
  - It classifies:
    - negative/prohibitive claim rejecting prohibited pattern => `aligned`
    - positive target claim asserting prohibited construction => `conflict`
    - historical/migration mention => `informational`
    - candidate concept => `candidate-new`
    - unclear prohibited mention => `ambiguous`
    - outside-scope text => `outside-scope`
  - Table rows have directional handling: old-side prohibited pattern => aligned; replacement-side prohibited pattern => conflict.
  - Header/separator rows skipped.
- Known Semantica warning appears during commands/tests:
  - `openai library not installed. Install with: pip install semantica[llm-openai]`
  This is non-blocking and expected with current optional deps. Mention in final.

Verification already run successfully:
- `bun install --frozen-lockfile` (needed because node_modules/cytoscape missing; no tracked lockfile change noted)
- `UV_PROJECT_ENVIRONMENT="$PWD/.semantica/venv" uv run --project tools/semantica-workbench --python 3.12 python -m unittest discover -s tools/semantica-workbench/tests`
  - Ran 20 tests, OK, after the final table-row cleanup too? Yes reran after table cleanup, OK.
- `bun run semantica:core:validate`
  - `core_ontology_valid=True entities=147 relations=72 errors=0 warnings=12`
- Full command gate after table cleanup:
  - `bun run semantica:setup`
  - `bun run semantica:check`
  - `bun run semantica:core:validate`
  - `bun run semantica:core:build`
  - `bun run semantica:core:export`
  - `bun run semantica:semantic:capability`
  - `bun run semantica:doc:triage -- --document tools/semantica-workbench/fixtures/docs/semantic-evidence-cases.md`
  - `bun run semantica:doc:extract -- --fixture`
  - `bun run semantica:doc:compare -- --fixture`
  - `bun run semantica:doc:diff -- --mode semantic --fixture`
  - `bun run semantica:core:query -- --named semantic-conflicts --format text`
  - `bun run semantica:core:query -- --sparql tools/semantica-workbench/queries/semantic-findings.rq --format text`
  - `bun run semantica:core:visualize`
  - `bun run semantica:core:serve -- --smoke --port 8766`
  Result: success. Port 8765 was busy earlier, so smoke passed on 8766.
- Real-doc semantic compares:
  - `RAWR_Canonical_Architecture_Spec.md` summary:
    - doc `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`
    - claim_count 1960
    - decision_grade_finding_count 3
    - finding_count 2863
    - findings_by_kind: aligned 1971, ambiguous 879, candidate-new 13
    - no conflict/deprecated-use
  - `RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md` summary:
    - claim_count 2571
    - decision_grade_finding_count 8
    - finding_count 2830
    - findings_by_kind: aligned 504, ambiguous 2321, candidate-new 5
    - no conflict/deprecated-use
  - Testing plan default fallback summary:
    - doc `docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md`
    - claim_count 191
    - decision_grade_finding_count 0
    - finding_count 225
    - findings_by_kind: aligned 80, ambiguous 145
    - no conflict/deprecated-use
- `git diff --check` passed.
- `git check-ignore` passed for:
  - `.semantica/current/semantic-compare-report.md`
  - `.semantica/current/graph-viewer.html`
  - `.semantica/current/evidence-claims.json`
  - `.semantica/current/semantic-evidence.ttl`
- `doc:triage` initially regenerated untracked `docs/projects/.../phase-4-testing-plan-diff-verification.md`; removed it and patched code so it won't write that tracked active doc anymore. Archived version remains under archive.

Need still do:
1. Close the three read-only agents if not already closed:
   - `019dcdb7-f542-72d0-9104-4a76ffdbf99a`
   - `019dcdb7-f5b0-7241-b2d5-f02888454abe`
   - `019dcdb7-f66b-7ed3-aa9c-5743b06ba4db`
2. Re-run quick final hygiene after the post-verification code patch/removal:
   - `git diff --check`
   - `git status --short --untracked-files=all`
   - perhaps `git check-ignore` again
   - possibly a short `bun run semantica:doc:triage -- --document tools/semantica-workbench/fixtures/docs/semantic-evidence-cases.md` to prove it no longer regenerates active phase-4 doc, then `git status` (but this may update ignored `.semantica`, fine)
3. Maybe run unit tests one more time if time permits (they already passed after table cleanup; no code changes except removing DIFF_SUMMARY and doc-triage write + fallback? tests not rerun after DIFF_SUMMARY removal? Full gate after removal included triage/extract/compare and succeeded; unit tests after table cleanup but before DIFF_SUMMARY removal maybe? DIFF_SUMMARY removal shouldn't affect unit tests).
4. Stage and commit with Graphite:
   - `git add package.json tools/semantica-workbench docs/projects/rawr-final-architecture-migration/.context/core-architecture-ontology-workflow/semantic-evidence-pipeline-implementation-plan.md docs/projects/rawr-final-architecture-migration/.context/core-architecture-ontology-workflow/semantic-evidence-pipeline-orchestrator-workflow.md`
   - `gt modify --all --message "feat(tools): add semantic evidence document comparison" --no-interactive`
   - `gt restack --upstack`
   - `git status --short --branch`
5. Final response should be concise. Include:
   - branch/commit hash
   - what changed
   - verification summary including warnings (OpenAI optional library warning non-blocking; 8765 busy so serve smoke used 8766)
   - no push/PR
   - mention ignored current viewer/report path under `.semantica/current/`
   - mention main checkout still has unrelated user dirty changes untouched maybe only if relevant.
   - Because branch created and commit will occur, final must include git directives:
     - `::git-create-branch{cwd="/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-semantic-diff-reframe-docs" branch="codex/semantic-evidence-comparison"}`
     - after staging: `::git-stage{cwd="/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-semantic-diff-reframe-docs"}`
     - after commit: `::git-commit{cwd="/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-semantic-diff-reframe-docs"}`
     Only include if actually done.
