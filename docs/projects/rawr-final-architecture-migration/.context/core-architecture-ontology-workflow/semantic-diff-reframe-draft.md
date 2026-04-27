# Semantic Diff Reframe Draft

## Status

Draft for review. This document is a clarified restatement of the next ontology work. It is not yet a full implementation plan.

## Why This Reframe Exists

The current ontology graph and Cytoscape viewer are useful as inspection surfaces, but the current document comparison path is not yet decision-grade semantic validation.

The failure case is simple:

```text
There is no root-level `core/` authoring root.
```

The current `doc:diff` implementation can flag that as a forbidden/stale finding because it matches the forbidden-pattern label `root-level core/ authoring root` in raw text. That is a lexical hit, not a semantic violation. The sentence is rejecting the forbidden pattern, so it should be aligned evidence, not a conflict.

This means the current implementation should be treated as a lexical triage aid, not as the semantic intelligence system we actually want.

## Clarified Goal

Build a semantic-diff workflow that compares documents by extracted meaning and graph constraints, not by raw phrase presence.

The desired comparison model is:

```text
reviewed source-of-truth ontology
  + semantically parsed comparison document
  + source-backed evidence graph
  + graph/constraint rules
  -> aligned / conflict / deprecated-use / candidate-new / ambiguous / outside-scope findings
```

The ontology remains the reviewed source-of-truth baseline. Semantica, LLM extraction, RDF/Turtle, SPARQL, Cytoscape, and JSON graph queries are execution and inspection substrates.

## What Is Still Sound

The YAML-based curated ontology is not the core problem.

YAML remains a reasonable authoring format for reviewed ontology inputs because it is easy to curate, review, diff, and annotate with source references, statuses, operational consequences, and classifier-readiness fields. Turtle/RDF should remain an export/query/interchange format unless we decide the authoring substrate itself must become RDF.

The useful split remains:

- reviewed YAML ontology: source-of-truth authoring surface;
- generated JSON graph: workbench/runtime graph view;
- generated Turtle/RDF/OWL/SHACL: query, validation, and interoperability surfaces;
- Cytoscape HTML: local review UI;
- Semantica: extraction, ontology, graph, export, validation, and future MCP substrate.

## What Is Not Sound Yet

The current `doc:diff` behavior is too lexical:

- it lowercases document lines;
- matches entity labels, IDs, and aliases;
- treats any match to `status: forbidden` as stale/forbidden;
- does not understand negation, modality, assertion type, or whether the document is proposing versus rejecting a pattern.

That makes it possible to confuse:

- "use a root-level `core/` authoring root" with
- "there is no root-level `core/` authoring root."

Those are opposite claims and must not collapse into the same finding.

## Better Model

### 1. Separate Ontology Facts From Evidence Claims

The source-of-truth ontology should model stable architecture concepts and constraints.

Comparison documents should be parsed into evidence claims. Evidence claims should carry:

- source path;
- line span;
- extracted text;
- subject/object/predicate;
- polarity: positive, negative, prohibitive, conditional;
- modality: descriptive, normative, proposed, rejected, historical, illustrative;
- authority context;
- confidence;
- resolved canonical entity IDs, deprecated vocabulary IDs, or candidate IDs;
- review state.

Evidence claims are not source-of-truth facts until reviewed and promoted.

### 2. Replace Raw Forbidden Phrase Hits With Constraint Semantics

`ForbiddenPattern` should not mean "any sentence containing this phrase is bad."

It should represent a prohibited construction pattern or deprecated target concept, for example:

```text
constraint.no-root-core-authoring-root
  forbids:
    AuthoringRoot(name = "core", location = "repo-root")
  replacement:
    Platform machinery lives under packages/core/*
```

A comparison finding should depend on the parsed claim:

- positive/proposed assertion of the prohibited pattern: conflict;
- negative/prohibitive assertion rejecting the prohibited pattern: aligned;
- historical mention of the prohibited pattern: informational or review-needed;
- ambiguous mention: needs review.

### 3. Keep Deprecated Vocabulary Separate From Prohibited Moves

Deprecated terms and forbidden construction paths are not the same.

Useful buckets:

- canonical concept;
- accepted alias;
- deprecated vocabulary;
- prohibited construction pattern;
- replacement rule;
- evidence-only mention;
- candidate concept.

This matters because a deprecated term may be valid to mention in a migration note, warning, or replacement table, while invalid as target architecture.

### 4. Parse Comparison Documents Semantically

The comparison path should extract document claims using Semantica and/or a constrained LLM schema before comparing them to the ontology.

The target flow:

```text
document
  -> chunks with source spans
  -> semantic extraction
  -> entity/relation/claim evidence graph
  -> entity resolution against canonical ontology
  -> graph/constraint comparison
  -> reviewable diff findings
```

This should replace the current lexical `term_in_line` behavior for any decision-grade verdict.

### 5. Use Semantica More Directly

The current workbench uses Semantica mostly for ontology/export surfaces. The next version should evaluate Semantica's extraction and graph facilities for comparison-document parsing.

Expected Semantica roles:

- parse or assist parsing of comparison documents into entities, relations, and claims;
- preserve provenance and source spans;
- produce/query graph artifacts;
- export RDF/Turtle for SPARQL and external tools;
- support future MCP-style agent access.

Semantica still does not decide RAWR truth. It helps build and query evidence.

## Draft Workstream

This is the rough next workflow, not yet the full implementation plan:

1. Rename current `doc:diff` behavior as lexical triage or mark its forbidden/stale verdicts as non-decision-grade.
2. Add an evidence-claim schema for comparison documents.
3. Add semantic extraction for comparison documents, using Semantica and/or the existing LLM extraction scaffolding.
4. Add entity resolution from extracted claims to canonical ontology IDs, deprecated vocabulary, prohibited patterns, and candidates.
5. Replace forbidden phrase matching with claim-aware constraint checks.
6. Update reports and Cytoscape overlays so findings distinguish lexical mentions, aligned rejections, target-architecture conflicts, candidates, and ambiguity.
7. Re-run the final specs and testing plan as verification cases.

## Immediate Archive Decision

The previous Phase 1-4 implementation plan, orchestrator workflow, and Phase 4 testing-plan diff verification summary are archived because they describe the current lexical proof run as if it were already semantic enough for verification.

They are preserved under:

```text
docs/projects/rawr-final-architecture-migration/.context/core-architecture-ontology-workflow/archive/lexical-diff-proof-run-superseded-2026-04-27/
```

They should be treated as historical implementation context, not active guidance.

## Open Questions For Full Plan

- Should Semantica's extraction path be the primary parser, or should we keep our LLM schema as the primary parser and use Semantica for graph/export/query?
- What exact claim schema do we need for polarity, modality, and target-architecture assertion detection?
- Should deprecated vocabulary and prohibited construction constraints remain in one ontology overlay or split into distinct overlay files?
- Should current `doc:diff` stay available as `doc:triage`, or should it be replaced in place once semantic diff is ready?
- What minimum evidence is required before a new concept becomes a candidate versus ignored outside-scope text?
