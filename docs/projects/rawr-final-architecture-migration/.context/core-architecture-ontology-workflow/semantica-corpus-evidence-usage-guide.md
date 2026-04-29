# Semantica Corpus Evidence Usage Guide

Status: usage guide for PR 251 corpus evidence intelligence
Date: 2026-04-29

## What This Is For

Use this guide when a developer or agent needs to review architecture-document evidence without manually reading the whole docs corpus first.

The workbench now supports this path:

```text
document sweep -> corpus evidence index -> focused queries -> source spans and reports -> human review decision
```

The important shift is discovery. The system does not decide architecture truth. It gives reviewers and agents a structured way to find likely review targets, candidate concepts, weak claims, source-authority signals, prohibited-pattern mentions, and document cleanup opportunities.

## The Core Rule

Generated evidence is not RAWR truth.

Use Semantica and workbench output to decide where to look and what question to ask next. Do not use generated evidence to automatically promote ontology concepts, rewrite source authority, approve architecture changes, or quarantine documents without human review.

Authority remains with:

- reviewed RAWR ontology inputs
- source-authority policy
- prohibited and deprecated term policy
- candidate promotion gates
- human review decisions

## Who Uses Which Surface

| User | Best entrypoint | Why |
| --- | --- | --- |
| Human architecture reviewer | `.semantica/current/sweep-evidence-index.html` | Scannable corpus evidence view with source/report links. |
| Human doing broad triage | `.semantica/current/doc-sweep-report.html` | Summary of document recommendations and per-document status. |
| Agent answering a question | `semantica:core:query` named queries | Stable structured output; avoids HTML scraping. |
| Ontology steward | `evidence-candidate-new`, `evidence-by-entity`, `evidence-unresolved-targets` | Shows candidate pressure without treating it as promotion. |
| Cleanup/quarantine reviewer | sweep queries plus `evidence-by-document` | Separates low-signal docs, outside-scope docs, and source-authority risk. |
| LLM evaluator | `semantica:doc:augment-llm` sidecar | Optional evidence augmentation only; deterministic output remains unchanged. |

## The Artifacts And What They Mean

| Artifact | Use it for | Do not use it for |
| --- | --- | --- |
| `doc-sweep-report.html` | First-pass document triage: which docs need review/update/outside-scope handling. | Inspecting every claim or treating counts as final decisions. |
| `sweep-evidence-index.html` | Human evidence navigation across claims, findings, candidate rows, ambiguity buckets, and report links. | Replacing source review. |
| `sweep-evidence-index.json` | Primary generated evidence contract for agents and tools. | RAWR truth or ontology authority. |
| `sweep-evidence-index.jsonl` | Streaming or line-oriented processing. | Manual review unless a tool consumes JSONL. |
| `sweep-evidence-index.ttl` | RDF/SPARQL projection over the JSON evidence index. | Primary authority or canonical architecture graph. |
| `sweep-evidence-agent-manifest.json` | Agent command map, artifact map, MCP status, and guardrails. | Claiming RAWR evidence MCP access exists; it is not wired yet. |
| `sweep-llm-evidence-augmentation.json` | Optional LLM sidecar suggestions over selected evidence rows. | Deterministic verdicts, ontology promotion, or source-authority decisions. |

## Start Here

Open the current human views:

```text
.semantica/current/doc-sweep-report.html
.semantica/current/sweep-evidence-index.html
```

Then run the health query:

```bash
bun run semantica:core:query -- --named evidence-summary --format text
```

For the accepted run, the current snapshot was:

- `46` indexed documents
- `4247` extracted claims
- `4795` findings
- `10` decision-grade findings
- `10` candidate-new findings
- `0` index warnings

Treat these as run facts, not durable corpus facts. Regenerate the sweep before relying on fresh counts.

## Use Case: I Need To Know What To Review First

Start with document-level triage, then drill into evidence.

```bash
bun run semantica:core:query -- --named evidence-by-document --format text
```

Look for:

- high `decision` counts
- high `candidates` counts
- `source-authority/high` documents
- documents marked `update-needed` or `review-needed`
- report links for per-document drilldown

What this answers:

- Which documents have the most review pressure?
- Which high-authority docs contain decision-grade findings?
- Which reports should I open first?

What it does not answer alone:

- Whether the source text is actually wrong.
- Whether a candidate should be promoted.
- Whether a doc should be rewritten.

Human next step: open the linked per-document report and inspect the source line context.

## Use Case: I Need To Review Architecture Evolution Pressure

Use candidate and entity pressure queries.

```bash
bun run semantica:core:query -- --named evidence-candidate-new --format text
bun run semantica:core:query -- --named evidence-by-entity --format text
bun run semantica:core:query -- --named evidence-unresolved-targets --format json
```

Use this when asking:

- What concepts are showing up but are not reviewed ontology facts?
- Which concepts recur across multiple documents?
- Which unresolved phrases might indicate ontology gaps?
- Which source lines support or weaken a proposed architecture concept?

Decision rule:

- `candidate-new` means "review this concept."
- It does not mean "add this concept."
- Repeated unresolved or candidate evidence can justify a human ontology review, not automatic promotion.

Typical reviewer outcomes:

- Promote after source-authority review.
- Leave as evidence-only.
- Add documentation clarification.
- Suppress as prose-only or outside-scope.
- Split into a smaller governed concept.

## Use Case: I Need To Check Prohibited Or Deprecated Architecture Patterns

Use prohibited-pattern evidence first.

```bash
bun run semantica:core:query -- --named evidence-prohibited-pattern-mentions --format text
```

This distinguishes important cases:

- A document may reject a prohibited construction. That can be aligned.
- A document may assert a prohibited construction. That needs review.
- A document may mention the phrase ambiguously. That needs source inspection.

Do not treat phrase hits as conflicts. The pipeline records polarity and review action because "do not import service internals" is different from "plugins import service internals."

Useful follow-up:

```bash
bun run semantica:core:query -- --sparql tools/semantica-workbench/queries/evidence-prohibited-patterns.rq --format json
```

Use SPARQL when you need graph-shaped output or want to compare counts against RDF projection.

## Use Case: I Need To Clean Up Docs Or Decide What Belongs In Quarantine

Start with sweep-level queries, then confirm with evidence rows.

```bash
bun run semantica:core:query -- --named sweep-no-signal-documents --format text
bun run semantica:core:query -- --named sweep-quarantine-candidates --format text
bun run semantica:core:query -- --named sweep-high-ambiguity-docs --format text
bun run semantica:core:query -- --named evidence-by-document --format text
```

Use this for:

- identifying docs with no active architecture signal
- finding likely outside-scope docs
- spotting docs that are mostly weak modality or unresolved prose
- separating archival/provenance material from active migration material

Quarantine rule:

The sweep can suggest review targets. It should not move files by itself. A human decides whether a document is active, archived, quarantine-worthy, or source-authority material.

## Use Case: I Need To Check Source-Authority Drift

Use the source-authority query.

```bash
bun run semantica:core:query -- --named evidence-source-authority-signals --format json
```

Use this when asking:

- Are high-authority specs producing candidate or parser-regression signals?
- Is source-authority text being interpreted as subordinate policy?
- Did a canonical document introduce concepts that are not governed yet?

This is a high-care workflow. Source-authority signals often mean the extraction or ontology boundary needs review, not that the source document is wrong.

## Use Case: I Need To Compare A Proposal Or Updated Architecture Doc

Use the proposal and compare commands when reviewing a specific document or proposal.

```bash
bun run semantica:doc:compare -- --fixture
bun run semantica:doc:proposal-compare -- --fixture
bun run semantica:doc:compare -- --document docs/path/to/document.md
bun run semantica:doc:proposal-compare -- --document docs/path/to/proposal.md
```

Use `--extraction-mode deterministic` for the reliable review path. Use `--extraction-mode semantica-llm --llm-provider ... --llm-model ...` only as evidence augmentation after provider behavior has been accepted for the specific review.

Use the outputs to ask:

- Which proposal claims are compatible with reviewed architecture?
- Which claims are compatible extensions?
- Which need canonical addendum review?
- Which conflict or remain unclear?
- What repair action is expected?

The report should point from finding to source claim to authority context to review action. If that chain is missing, do not use the finding as decision-grade.

## Use Case: I Want An Agent To Answer A Corpus Question

Agents should use the manifest and named queries.

```bash
bun run semantica:core:query -- --named evidence-agent-manifest --format json
bun run semantica:core:query -- --list
```

Agent rules:

- Query the JSON-backed named surfaces first.
- Use HTML only as a human-readable report target.
- Do not scrape `.semantica/current` internals.
- Preserve source path, line span, finding kind, rule, confidence, and review action in answers.
- State when a row is evidence-only, candidate-only, ambiguous, or source-authority-sensitive.
- Open source text only after the query has narrowed the question.
- Never promote candidates or rewrite authority from generated evidence.

Good agent question examples:

- "Which candidate concepts recur in source-authority docs?"
- "Which prohibited-pattern mentions are actual assertions rather than rejections?"
- "Which docs have high weak-modality ambiguity and should be clarified?"
- "Where does `core.kind.service` show the most evidence pressure?"
- "Which review-needed docs have exact source spans for candidate concepts?"

Bad agent question examples:

- "What is the architecture truth?"
- "Automatically update the ontology from candidates."
- "Quarantine every low-signal document."
- "Use the LLM sidecar as final judgment."

## Use Case: I Want LLM Help Without Weakening Authority

Run LLM augmentation as a sidecar over selected evidence rows.

```bash
bun run semantica:doc:augment-llm -- --run latest --llm-provider openai --limit 3
bun run semantica:doc:augment-llm -- --run latest --llm-provider mock --llm-model mock-model --limit 2
```

The sidecar may help:

- summarize ambiguous rows
- suggest possible mappings
- cluster related unresolved concepts
- propose review questions

The sidecar must not:

- change deterministic index rows
- change verdicts
- promote candidates
- rewrite ontology
- become source-authority

Current acceptance only validated blocked/no-model and mock modes. Real provider quality still needs a separate evaluation pass.

## How The Human And Agent Team Should Work

The useful team is small because the work is tightly coupled around authority boundaries.

| Role | Accountable for | Consumes | Produces |
| --- | --- | --- | --- |
| Human architecture reviewer | Final interpretation and review decision | query rows, reports, source text | approve/reject/clarify decisions |
| Agent triager | Finding relevant evidence quickly | named query outputs, manifest | concise evidence packets with source spans |
| Ontology steward | Candidate and governed concept decisions | candidate/unresolved/entity evidence | promotion, rejection, or defer decisions |
| Documentation owner | Source document edits | review actions and source spans | doc changes or clarification plan |
| Cleanup steward | Archive/quarantine recommendations | sweep and evidence-by-document outputs | cleanup decision list |

Interface contract:

1. Agent triager gives the human a bounded packet: question, query used, rows found, source spans, report links, and uncertainty.
2. Human reviewer inspects source context and decides whether the evidence matters.
3. Ontology steward handles any promotion or candidate disposition.
4. Documentation owner edits source docs only after the review decision is clear.
5. Cleanup steward moves or quarantines docs only after confirming scope and authority.

Failure mode to avoid:

Do not let an agent turn a broad query result into a broad action. The handoff must narrow evidence, not expand automation.

## How To Interpret Common Findings

| Finding signal | What it usually means | First action |
| --- | --- | --- |
| `decision-grade` | Deterministic policy found a high-confidence review point. | Inspect source span and report chain. |
| `candidate-new` | A concept may deserve governed ontology review. | Review source authority and operational consequence. |
| `ambiguous` | Polarity, modality, scope, or target resolution is incomplete. | Clarify or leave as prose-only. |
| `weak-modality` | The text uses non-decision language such as may/should/can. | Do not treat as architecture requirement without review. |
| `unresolved-target` | The system could not map the claim to a reviewed concept. | Map to ontology, candidate, or prose-only. |
| `aligned` | The finding appears consistent with current policy. | Usually no action unless surrounding context contradicts it. |
| `outside-scope` | The doc or claim may not belong in active architecture comparison. | Confirm scope before cleanup. |
| source-authority signal | High-authority source produced review pressure. | Review carefully; it may be ontology/parser drift. |

## Recommended Review Order

For humans:

1. Open `doc-sweep-report.html` to understand run shape.
2. Open `sweep-evidence-index.html` for evidence navigation.
3. Review `evidence-summary` for run health.
4. Review `evidence-by-document` to pick the first document.
5. Review `evidence-candidate-new` and prohibited-pattern mentions.
6. Open per-document reports only after a query identifies why they matter.
7. Read source text before making any architecture, ontology, cleanup, or quarantine decision.

For agents:

1. Read `evidence-agent-manifest`.
2. Pick the narrowest named query that answers the user's question.
3. Use JSON output when the answer needs exact rows.
4. Return source-backed evidence packets.
5. State authority boundaries and uncertainty.
6. Ask for human review when promotion, cleanup, or source-authority decisions are required.

## What This Is Good At Today

- Finding where architecture-document review should start.
- Preserving source spans and report links across a sweep.
- Distinguishing evidence categories from truth categories.
- Surfacing candidate concept pressure.
- Finding prohibited-pattern mentions without treating every mention as a conflict.
- Giving agents stable commands instead of making them scrape reports.
- Providing an RDF/SPARQL projection for graph-shaped questions after the JSON index exists.

## What This Is Not Good At Yet

- Arbitrary natural-language architecture QA.
- Real-provider LLM extraction quality judgments.
- Automatic ontology growth.
- Automatic document quarantine or cleanup.
- MCP-based RAWR evidence access; the manifest records that it is not wired.
- Replacing human source reading for final judgment.

## Regeneration Checklist

Run this when you need fresh evidence:

```bash
UV_PROJECT_ENVIRONMENT="$PWD/.semantica/venv" uv run --project tools/semantica-workbench --python 3.12 python -m unittest discover -s tools/semantica-workbench/tests
bun run semantica:semantic:capability
bun run semantica:doc:sweep
bun run semantica:doc:index -- --run latest
bun run semantica:core:query -- --named evidence-summary --format text
```

Then inspect:

```text
.semantica/current/doc-sweep-report.html
.semantica/current/sweep-evidence-index.html
```

Before relying on the run:

- Confirm `warning_count` is `0`.
- Confirm generated artifacts are under `.semantica/`.
- Confirm candidate and source-authority rows are treated as review evidence.
- Confirm direct source text before changing architecture docs, ontology, or quarantine state.
