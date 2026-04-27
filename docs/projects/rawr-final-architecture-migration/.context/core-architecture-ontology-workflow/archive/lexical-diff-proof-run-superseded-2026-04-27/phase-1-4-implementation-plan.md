# Core Ontology Operationalization Implementation Plan

## Summary

Implement the next stacked branch above `codex/core-architecture-ontology-workflow` to turn the CloudPro draft into a strict, repo-local, machine-validated ontology, refactor the Semantica workbench so ontology data is an input rather than hardcoded script behavior, generate inspectable graph/visual outputs, and run a Phase 4 verification diff against the canonical testing plan.

Phase 4 is only a proof run. It validates the Phase 3 graph against `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Testing_Plan.md`; it does not rewrite the testing plan or perform Phase 5 migration planning.

## Branch And Safety

- Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-semantica-workbench-setup`
- Branch: `codex/core-ontology-operationalization`
- Parent: `codex/core-architecture-ontology-workflow`
- Generated state remains ignored under `.semantica/`.
- Finalized source specs remain unmodified.
- Commit locally with Graphite only after verification:
  - `gt modify --all --message "feat(tools): operationalize core ontology graph" --no-interactive`
  - `gt restack --upstack`

## Phase 1: Normalize Reviewed Ontology Inputs

- Snapshot `/Users/mateicanavra/Documents/projects/RAWR/RAWR_Core_Ontology_Draft.md` into this context packet for traceability.
- Create reviewed layered ontology source files under `tools/semantica-workbench/ontologies/rawr-core-architecture/`:
  - `core-architecture-ontology-v1.yaml`
  - `runtime-realization-overlay-v1.yaml`
  - `authority-document-overlay-v1.yaml`
  - `classifier-readiness-overlay-v1.yaml`
  - `candidate-queue-v1.yaml`
- Add a strict schema/contract for entity types, predicates, statuses, layers, source refs, operational consequences, classifier readiness, candidates, and exclusions.
- Correct draft issues before ingestion:
  - remove the inaccurate `101 canonical entities` claim from durable machine inputs;
  - drop the non-controlled `produced_by` candidate relation from canonical relation seeds;
  - include authority document entities directly in the authority overlay seed;
  - normalize source paths to repo-relative paths;
  - strip CloudPro `filecite` markers from durable ontology inputs.
- Add source-reference resolution that validates referenced files exist and resolves section headings to line spans where possible.

## Phase 2: Refactor Workbench Around Ontology Inputs

- Keep existing extraction commands available.
- Add seed-first commands that load the reviewed ontology, validate it, build canonical/layered views, export Semantica-compatible payloads, and treat document extraction as evidence/diff input rather than architecture truth.
- Add root scripts:
  - `semantica:core:validate`
  - `semantica:core:build`
  - `semantica:core:export`
  - `semantica:core:visualize`
  - `semantica:doc:diff`
- Use Semantica deliberately:
  - feed reviewed classes/properties into `OntologyEngine`;
  - generate OWL/SHACL where supported;
  - record Semantica status/version/errors in run metadata.
- Do not let Semantica auto-generation decide RAWR truth. The reviewed YAML ontology remains authoritative.

## Phase 3: Inspectable Graph Outputs

- Write ignored artifacts under `.semantica/runs/<timestamp>-<git-sha>/`.
- Produce canonical graph JSON, layered graph JSON, candidate queue JSON, validation report JSON, Semantica status/export metadata, GraphML, and a simple HTML graph viewer/report.
- Default inspection view emphasizes core + laws + gates; runtime artifacts remain visible but visually grouped and separately countable.
- Report counts by layer/status/type, forbidden rules, replacement rules, unresolved candidates, validation failures, source coverage, and classifier-readiness annotations.

## Phase 4 Verification Run

- Run semantic diff against:
  - `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Testing_Plan.md`
- Diff behavior:
  - resolve testing-plan terms to canonical ontology IDs;
  - detect forbidden/deprecated target terms;
  - identify missing or underrepresented validation gates;
  - classify findings as `aligned`, `stale`, `conflict`, `candidate-new`, or `review-needed`;
  - preserve source refs and line spans.
- Produce ignored run artifacts plus tracked summary:
  - `docs/projects/rawr-final-architecture-migration/.context/core-architecture-ontology-workflow/phase-4-testing-plan-diff-verification.md`

## Verification Commands

```bash
bun run semantica:setup
bun run semantica:check
bun run semantica:core:validate
bun run semantica:core:build
bun run semantica:core:export
bun run semantica:core:visualize
bun run semantica:doc:diff -- --document docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Testing_Plan.md
UV_PROJECT_ENVIRONMENT="$PWD/.semantica/venv" uv run --project tools/semantica-workbench --python 3.12 python -m unittest discover -s tools/semantica-workbench/tests
git diff --check
git check-ignore .semantica/current/report.md
```

## Acceptance Criteria

- Unknown predicates are rejected.
- Relation endpoints resolve.
- Locked facts have source refs.
- Candidate/evidence-only facts stay out of canonical views.
- Generated outputs are ignored.
- The testing-plan diff produces actionable findings or explicit alignment with source-backed evidence.
- The worktree is clean after the Graphite commit.
