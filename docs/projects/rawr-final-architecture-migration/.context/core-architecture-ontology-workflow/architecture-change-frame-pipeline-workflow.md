# Architecture Change Frame Pipeline Workflow

## Objective

Build architecture proposal intelligence on top of the existing RAWR semantica workbench:

```text
document
  -> evidence-backed ArchitectureChangeFrame
  -> noun mappings
  -> proposal graph
  -> claim comparisons
  -> verdict/repair package
  -> review report
```

RAWR governance remains authoritative. semantica and LLM output are evidence/proof metadata, not RAWR truth.

## Guardrails

- Treat the external bundle as comparison geometry/reference vocabulary, not a replacement ontology.
- Keep reviewed RAWR ontology, authority overlays, statuses, source refs, promotion gates, candidate queues, deprecated terms, and prohibited patterns as decision authority.
- Every ArchitectureChangeFrame field must be evidence-backed where applicable with source path, heading/context, line/char spans, extraction method, confidence, and review state.
- Deterministic RAWR policy assigns decision-grade verdicts.
- semantica and LLM extraction may propose evidence only.
- LLM extraction is optional and capability-gated; deterministic validation/comparison remains the reliable path.
- Do not introduce service sprawl. Keep this as a logical pipeline layer in the existing workbench and CLI structure.

## Implementation Checklist

1. Add a validated frame-production path:
   - `document -> RAWR evidence -> ArchitectureChangeFrame`
   - require structured source-backed evidence refs
   - prevent extracted fields from becoming RAWR truth
2. Add `semantica:doc:frame` as the narrow first CLI surface.
3. Add deterministic frame fixtures for:
   - ownership
   - projection
   - runtime
   - resource provider
   - forbidden risk
   - verification
   - ambiguity
   - missing evidence
4. Add noun-mapping output:
   - accepted mapping
   - candidate mapping
   - unclear mapping
   - rejected mapping
   - external/reference-geometry-only mapping
5. Load the external bundle as comparison geometry only:
   - do not replace reviewed RAWR ontology
   - record geometry version/hash for provenance
6. Build proposal graph output from validated frames and mappings.
7. Add claim comparison verdicts:
   - compatible
   - compatible-extension
   - needs-canonical-addendum
   - conflicts
   - unclear
8. Add verdict/repair package fields:
   - source claim
   - resolved target/reference concept
   - authority context
   - comparison rule
   - verdict
   - repair action
   - confidence
   - review state
9. Add `semantica:doc:proposal-compare` for the full review package.
10. Integrate generated review output into existing report/query/sweep surfaces without changing existing safe defaults.
11. Run verification gates and commit completed phases through Graphite.

## Generated Artifacts

Frame and proposal-compare commands should write generated outputs under ignored `.semantica/` state:

- `architecture-change-frame.json`
- `architecture-change-frame-validation.json`
- `noun-mappings.json`
- `proposal-graph.ttl`
- `claim-comparisons.json`
- `verdict-repair.json`
- `proposal-review-report.md`
- `proposal-provenance.json`

## Verification Gates

Run the relevant gates after implementation phases:

```bash
UV_PROJECT_ENVIRONMENT="$PWD/.semantica/venv" uv run --project tools/semantica-workbench --python 3.12 python -m unittest discover -s tools/semantica-workbench/tests
bun run semantica:semantic:capability
bun run semantica:doc:extract -- --fixture
bun run semantica:doc:compare -- --fixture
bun run semantica:doc:sweep
bun run semantica:doc:frame -- --fixture
bun run semantica:doc:proposal-compare -- --fixture
git diff --check
git check-ignore .semantica/current .semantica/runs
gt status
```

## Acceptance Criteria

A developer can run one architecture proposal through the pipeline and receive a source-backed review package that identifies compatible claims, extension claims, conflicts, unclear claims, candidate mappings, and repair actions. The report explains why each finding exists and what review action is expected. RAWR truth changes only through human-governed promotion.
