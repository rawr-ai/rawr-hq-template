# Cytoscape Viewer Orchestrator Workflow

## Objective

Deliver a repo-local Cytoscape graph viewer and agent query surface for the RAWR core architecture ontology without changing ontology authority. The reviewed YAML ontology remains truth; generated JSON/RDF/HTML are derived inspection surfaces.

## Team Shape

- Codex is DRI for final synthesis, code integration, Graphite branch hygiene, and verification.
- Data-contract reviewer checks that Cytoscape elements preserve entity/relation IDs, endpoint resolution, layer/status/type metadata, source refs, and diff overlays.
- Viewer reviewer checks that throughline presets make architecture review easier and do not collapse into an undifferentiated graph blob.
- Query reviewer checks that `core:query` makes RDF/SPARQL-style agent questions explicit without requiring a persistent graph database.
- Verifier checks command success, ignored generated outputs, regression tests, and clean repo state.

## Interfaces

- Reviewers provide concise checklists and risks; Codex owns implementation decisions.
- No reviewer edits files unless explicitly assigned a disjoint write scope.
- Any semantic uncertainty is represented as candidate/evidence metadata, not promoted into canonical architecture.

## Gates

- Viewer renders an interactive Cytoscape canvas from generated graph data.
- Presets for ownership, runtime, gates, forbidden/replacement terms, testing-plan diff, and classifier-readiness change the visible graph deterministically.
- Query examples answer useful semantic-intelligence questions from the generated graph or RDF export.
- Tests cover graph element generation, HTML payload/assets, diff overlay counts, default candidate hiding, and query command behavior.
