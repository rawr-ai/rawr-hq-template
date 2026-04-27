# Semantic Evidence Pipeline Orchestrator Workflow

## Objective

Implement the semantic evidence comparison pipeline without repeating the lexical-diff failure mode. The reviewed RAWR ontology remains the source of truth; Semantica, generated graphs, RDF, SPARQL, Cytoscape, and LLM extraction are substrates for extracting, resolving, querying, and reviewing evidence.

## Team Structure

Codex is the DRI for integration, final decisions, branch hygiene, and verification.

Use agents only for bounded review or investigation work:

- Semantica capability reviewer: verifies which pinned Semantica APIs are useful and where local adapters should wrap them.
- Ontology boundary reviewer: checks that deprecated vocabulary, prohibited construction paths, evidence claims, findings, and candidates are not collapsed into canonical truth.
- Evidence extraction reviewer: checks schema, prompt, fixture cases, and polarity/modality/scope handling.
- Workbench/reporter reviewer: checks CLI flow, generated artifacts, viewer/query compatibility, and tests.
- Verification reviewer: validates adversarial fixtures and final-spec false-positive regressions.

## Shared Frame For Every Agent

- Semantica is substrate, not RAWR truth.
- Reviewed ontology YAML is an authoring source that must compile into typed JSON/RDF/SHACL graph surfaces.
- Evidence claims are not canonical architecture.
- Candidates do not become canonical without review.
- A forbidden phrase match is never a decision-grade finding by itself.
- A decision-grade finding requires parsed claim, source span, polarity, modality, scope, resolved ontology target, and rule explanation.
- The known regression is a negated sentence such as `There is no root-level core/ authoring root.` being flagged as forbidden.

## Handoff Contract

Each phase produces a concrete artifact consumed by the next phase:

- Capability report feeds adapter choices.
- Ontology boundary cleanup feeds extraction and resolution.
- Evidence claim schema feeds extraction output.
- Resolved evidence feeds semantic compare.
- Semantic compare feeds reports, queries, viewer overlays, and verification.

Agent reports must be concise and grounded in file paths, API names, command outputs, or fixture results. Conclusions without evidence are review notes, not decisions.

## Review Gates

Do not mark a phase complete until:

- The generated artifact exists.
- The artifact is validated by a command or focused review pass.
- Known adversarial examples are covered or explicitly deferred.
- Any fallback or partial Semantica use is recorded honestly.
- Repo source truth is not confused with generated `.semantica/` outputs.

## Branch And Cleanup Rules

- Work on `codex/semantic-evidence-comparison`.
- Keep generated outputs under ignored `.semantica/`.
- Do not modify finalized source specs.
- Do not delete archived proof-run docs.
- Commit with Graphite when verification passes.
- Do not push or open a PR unless explicitly asked.
