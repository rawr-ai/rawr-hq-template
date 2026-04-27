# Cloud Pro Task Prompt: Final Integrated Canonical Architecture

You own the final RAWR integrated canonical architecture specification.

Your task is not to summarize inputs, apply a mechanical diff, or produce a migration plan. Your task is to produce one final standalone top-level canonical architecture document whose whole is more coherent, operational, and durable than any single input source.

## Work Standard

This is a critical architecture work product. Do not shortcut the work to satisfy an arbitrary length or time constraint. Use enough depth, iteration, and review to reach high confidence in the final specification's correctness, cohesion, clarity, and usefulness.

The final document should be as long as the architecture requires and no longer. Do not pad it, but do not omit necessary context, connective tissue, diagrams, examples, or boundary explanations merely to stay concise.

Treat the change set as architectural direction, not a find-and-replace script. Local edits must leave the whole document aligned with itself. When you modify a section, consider what changes upstream and downstream: terminology, ownership laws, diagrams, examples, invariants, and subsystem boundaries must still agree after the edit.

Use your strongest internal reasoning and review discipline. Design your workflow before drafting, proceed in stages, and iterate through progressively deeper review layers until the result reads as a cohesive specification rather than a patched baseline.

## Source Files

Use only these files:

| File | Role |
| --- | --- |
| `01-final-decision-and-change-set.md` | Binding decision and change authority. |
| `02-version-b-baseline.md` | Primary document to revise. |
| `03-version-a-transplant-source.md` | Transplant/mining source only where the change set allows it. |
| `04-runtime-realization-overlap-authority.md` | Runtime-overlap authority only; do not copy its full subsystem detail. |

Ignore all unlisted project files, prior prompts, reports, transcripts, scratch work, migration plans, old alternates, current implementation reality, and project memory.

## Authority Order

1. `01-final-decision-and-change-set.md`
2. `04-runtime-realization-overlap-authority.md`, only where runtime realization overlaps the architecture document
3. `02-version-b-baseline.md`
4. `03-version-a-transplant-source.md`, only for named or clearly compatible transplants

Version B is the baseline. Version A is not a competing baseline. Do not average the candidates.

## Interpretation / Framing Stage

First, internalize what this document is.

It is the top-level canonical architecture specification: the system entry point, overview, ontology, shared vocabulary, ownership model, and integration map.

It is not the implementation-detail owner for every subsystem. Runtime realization, agent governance, desktop native internals, telemetry backend details, runtime catalog persistence, and other deeper systems may have or later receive their own subsystem specifications.

The integrated architecture document still owns the cross-system geometry: flows, layers, separations, interfaces, non-interfaces, entity relationships, and the places where subsystem specifications attach.

## Analysis Stage

Read the baseline in full. Read the transplant source in full. Read the change set carefully. Consult the runtime realization spec only where it helps preserve runtime-overlap correctness and subsystem boundaries. Do not read `04` as a wholesale drafting source; use it only to verify overlap terms and boundary correctness.

Build an internal ledger of:

- locked decisions
- exact edit requirements
- semantic/qualitative requirements
- optional improvements worth including
- runtime details to summarize only
- material to exclude because it is superseded, stale, too low-level, or process/provenance narrative

Do not return the ledger.

## Planning Stage

Plan the final document spine before drafting.

Keep Version B's section spine as the default. Make only local structural moves needed to apply the change set, integrate accepted transplants, remove duplication, or resolve conflicting architecture law.

Do not perform a broad re-outline, candidate averaging pass, or fresh architecture resynthesis.

## Drafting + Revision Stage

Produce the final revised canonical architecture document.

Apply exact edits exactly where the change set requires exact wording.

For semantic/qualitative changes, preserve the architectural intent and improve the document's coherence. Do not over-copy source text, and do not under-apply the decision because the instruction is not line-by-line.

The document must show:

- how systems connect and flow into each other
- where layers separate
- where interfaces exist
- where interfaces intentionally do not exist
- how canonical terminology fits together
- how the operational geometry works, not only hierarchical composition

Use diagrams, tables, and examples where they make the architecture more understandable. Keep them architecture-level and render-safe.

## Review Stage

Before returning the final document, internally review in layers across these axes. Revise after each layer when it exposes real incoherence, omission, contradiction, or overreach:

- architectural coherence of the whole system
- information design and grouping
- correct inclusion/exclusion of implementation details
- hard boundaries between canonical architecture and subsystem specs
- clarity as an overview and dynamic picture of the system
- durability as the system grows
- descent from vision/philosophy to ontology to concrete abstractions to the lowest necessary overview-level detail
- correctness and usefulness of diagrams for flows, layers, separations, interfaces, and non-interfaces
- migration-readiness without migration-plan content
- no prompt, provenance, review, candidate, or source-document narrative

Return only the final standalone integrated canonical architecture specification.
