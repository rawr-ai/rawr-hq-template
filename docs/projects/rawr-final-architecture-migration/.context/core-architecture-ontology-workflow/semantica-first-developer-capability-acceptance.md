# semantica-First Developer Capability Acceptance

Branch: `codex/semantica-first-pipeline-implementation`

Stage: Phase 8 acceptance handoff.

## Verdict

The migration now provides a materially better developer review workflow while preserving the core authority boundary:

- semantica is used as a proven substrate for capability inventory, intake/span proof, extraction pilot, graph proof, reasoning/conflict proof, MCP/export/visualization inventory, and pipeline execution proof.
- RAWR remains authority for reviewed ontology truth, source authority, controlled predicates, recommendation categories, decision-grade findings, review actions, and promotion gates.
- semantica output remains evidence or proof metadata until reviewed and promoted.

This is accepted as a Phase 8 proof-and-handoff state, not as the final removal of all local fallback logic.

## Developer Capability Check

| Capability | Status | Evidence |
| --- | --- | --- |
| Compare an architecture document and get source-spanned findings | Accepted | `semantica:doc:compare` succeeds over the active canonical architecture and runtime realization specs. The testing-policy compare is a quarantine/provenance smoke because no active testing-plan spec exists in `resources/spec/`. Unit tests require finding source path, line span, polarity, modality, assertion scope, entity ID, and explanation chain. |
| Understand why a finding exists | Accepted | Each finding includes an explanation chain: source claim, resolved target, authority context, rule result, finding kind, decision-grade flag, and review action. |
| Query graph/provenance/review state through a stable interface | Accepted | `semantica:core:query -- --named semantica-review-surface --format text` reports MCP, export, visualization, semantic artifact presence, candidate separation, and review counts without scraping `.semantica/current`. |
| Distinguish missing semantic compare from zero findings | Accepted | Phase 6 review finding fixed; missing compare artifacts now report `missing-run-doc-compare-first` and `None` counts. |
| Preserve reviewed target architecture from evidence/candidate leakage | Accepted | Graph and review-surface tests reject candidate/evidence leakage into target views. |
| Use semantica without delegating truth to it | Accepted | Proof metadata is attached for semantica surfaces; RAWR fallback/removal triggers remain explicit. |

## Verified Commands

Unit and integration:

- `UV_PROJECT_ENVIRONMENT="$PWD/.semantica/venv" uv run --project tools/semantica-workbench --python 3.12 python -m unittest discover -s tools/semantica-workbench/tests`
- `bun run semantica:check`
- `bun run semantica:core:validate`
- `bun run semantica:core:build`
- `bun run semantica:core:export`
- `bun run semantica:semantic:capability`
- `bun run semantica:doc:extract -- --fixture`
- `bun run semantica:doc:extract -- --fixture --semantica-pilot`
- `bun run semantica:doc:compare -- --fixture`
- `bun run semantica:doc:sweep -- --root tools/semantica-workbench/fixtures/docs/sweep`
- `bun run semantica:core:query -- --named semantica-review-surface --format text`
- `bun run semantica:core:visualize`

Behavioral real-doc compares:

- `bun run semantica:doc:compare -- --document docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`
- `bun run semantica:doc:compare -- --document docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
- `bun run semantica:doc:compare -- --document docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md`

Note: the testing-plan compare is not active target-policy acceptance. The only testing-plan artifact present in this worktree is under `resources/spec/quarantine/`, so this command proves the workflow can process that provenance document without promoting it to current authority.

Developer-facing query smoke after the final compare:

- `bun run semantica:core:query -- --named decision-review-queue --format text`
- `bun run semantica:core:query -- --named semantica-review-surface --format text`

Final observed query summary:

- `decision-review-queue`: `157` findings, `131` review-queue items, `0` decision-grade findings, `61` suppressed lines.
- `semantica-review-surface`: MCP available; required review tools present; semantic compare status `present`; target view excludes candidates; visualization available; static viewer present.

## Proven semantica Surfaces

| Surface | Current use | Authority boundary |
| --- | --- | --- |
| Capability inventory | Enumerates pinned modules, optional extras, feature gates, MCP tools/resources, adversarial fixtures, and replacement matrix. | Capability proof only. |
| Intake/split/provenance | Uses `StructuralChunker` and `SourceReference` in a span-preserving probe. | `chunk_markdown` remains decision-grade fallback until Markdown parser/span parity is proven. |
| Extraction | Pilot uses `TripletExtractor` and maps output into evidence-only RAWR shape. | Deterministic RAWR extraction remains oracle; no locked ontology promotion. |
| KG/normalization/dedup | Constructs semantica graph proof metadata and validates target/candidate boundaries. | RAWR owns stable IDs, predicates, target view, candidate queue, and promotion gates. |
| Conflict/reasoning/explanation | Probes conflict detector and reports provider-gated reasoner status; adds deterministic explanation chains. | RAWR verdict rules and review actions remain authoritative. |
| MCP/query/export/visualization | Stable named query reports MCP/export/visualization readiness and separation guarantees. | Semantica MCP is generic until RAWR graph/evidence adapter is implemented. |
| Pipeline | Builds and executes a no-op sweep skeleton and samples run-state APIs. | Current RAWR sweep loop remains operational; checkpoint/retry behavior is not accepted. |

## Blocked Or Partial Surfaces

| Surface | Status | Owner | Deletion target | Removal trigger |
| --- | --- | --- | --- | --- |
| LLM extraction/provider reasoning | Blocked by missing LLM/provider extras in the current environment. | semantica extraction adapter owner | Remove provider-blocked branch from decision-grade extraction once provider path is accepted. | Install/prove OpenAI, Anthropic, LiteLLM, or Ollama provider path and pass fixture parity with source spans. |
| Markdown parser replacement | Partial; pinned semantica lacks proven exact Markdown parse/span parity. | intake/provenance adapter owner | Retire decision-grade `chunk_markdown` fallback from intake. | Semantica intake preserves exact Markdown spans and matches or intentionally supersedes `chunk_markdown` parity. |
| Decision-grade semantica extraction | Partial; pattern triplets do not carry full RAWR semantics. | semantic evidence adapter owner | Retire deterministic extraction as the primary parser, keeping it only as a regression oracle if useful. | Semantica extraction preserves polarity, modality, assertion scope, authority context, confidence, and stable IDs. |
| semantica conflict/reasoning verdict execution | Partial; conflict detector output is not mapped to RAWR review semantics. | review semantics owner | Move RAWR verdict execution wrapper from local rules to semantica-backed explanation/reasoning path. | Semantica reasoning preserves the full source claim -> target -> authority -> rule -> finding -> review action chain. |
| MCP as decision-grade RAWR graph interface | Partial; generic MCP inventory is present. | MCP/query surface owner | Replace generic inventory-only query path with a RAWR graph/evidence MCP adapter. | Add and prove a RAWR graph/evidence adapter for MCP-backed review questions. |
| semantica visualization replacement | Partial; modules are importable and inventoried. | review artifact owner | Retire or reduce static Cytoscape only if semantica visualization is better for review. | Visualization preserves RAWR IDs, source lineage, candidate separation, and review-finding context better than static Cytoscape. |
| Pipeline checkpoint/retry | Partial; DAG execution and run-state APIs are proven, not durable checkpoint/retry behavior. | sweep orchestration owner | Move sweep run mechanics from local loop to semantica pipeline primitives. | Checkpoint/resume/retry semantics pass fixture and failure-mode tests without changing RAWR recommendations. |

## Residual Uncertainty

- The manual locked-core ontology model is still a governance choice, not proven optimal. It is working as a truth boundary, but future LLM extraction may show the need for a different evidence-to-core promotion pattern.
- semantica LLM extraction quality is untested in this environment because provider extras are missing.
- Large real-doc compares complete, but the output is still a heuristic evidence review surface, not architecture truth.
- The current run model writes the latest semantic compare artifact into one run; this is acceptable for the CLI wrapper but future multi-document compare UX should make per-document artifacts easier to address directly.

## Next Implementation Plan Inputs

- Prioritize provider-backed semantica extraction proof before removing deterministic extraction fallback.
- Add a RAWR MCP graph/evidence adapter only after the query contract is stable.
- Treat pipeline checkpoint/retry proof as a separate failure-mode milestone.
- Keep every fallback scoped with an owner and removal trigger; missing semantica extras remain blockers for that feature, not permission to rebuild a parallel local platform.
