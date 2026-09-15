# Framing Investigation Baseline

This is an informative precursor, not a complete investigation design or a
recovered skill. It records the owner's requested approach before the dedicated
phase begins: prepare a trustworthy conversation dataset, then interpret it.
The [philosophy](../../system/HABITAT_DESIGN_PHILOSOPHY.md) records presently
agreed intent; it is not a substitute for historical evidence.

## Two Different Outputs

1. Habitat's governing design intent: what belonged to Habitat, what belonged
   to vendors, which commitments persisted, and which choices were provisional
   or superseded.
2. The collaborative framing method: how context selection, classification,
   human correction, vocabulary and keyword-bag changes, exclusion, review,
   execution, and handoff kept decisions aligned.

Extracting only architectural conclusions would lose the second output. The
working unit is a contextual episode, not an isolated quote:

`agent direction -> human intervention -> changed frame -> decision -> observed outcome`

An episode may lack some stages. Missing outcomes or acceptance remain missing,
not filled in from the current architecture or an agent's summary.

## Source Boundary

The intended corpus includes the original Civilization 7, Magic Migration, and
Habitat/Rawr conversations, plus the later takeover/release conversation
"Assess Habitat substrate progress" (`01a06e3d-0085-79d2-99c7-683233b5938d`).
The exact three predecessor IDs, ranges, forks, and relationships are still
unverified. Titles and current project associations are candidates, not identity
proof. The [13 retained documents](SOURCES.md) are derivative evidence, not the
full corpus. This precursor did not ingest or analyze the historical threads.

## Provisional Data Units

| Unit | Minimum Useful Record |
|---|---|
| Source | Stable identity, title, platform, lineage, date coverage, role, locator, capture/hash, completeness and access limits. |
| Message or span | Source/message/parent IDs, sequence and time, speaker, original text, exact locator, content type, quoted authorship, truncation or compaction flags. |
| Episode | Linked source spans for the initial direction, intervention, changed frame, decision, excluded alternatives, outcome, and missing stages. |
| Claim or change | Category, expressed intent versus interpretation, proposal/acceptance evidence, scope and time, support, contradiction, supersession, uncertainty. |
| Vocabulary observation | Original term or keyword bag, speaker, context, additions/removals/redefinitions, and explicitly tentative aliases. |

Keep raw captures immutable, normalization reproducible, and interpretation in
a separate layer. Forked conversations form a graph, not one necessarily linear
chronology. Deduplication retains every occurrence and its lineage.

## Likely Stages

1. Verify source identities, available formats, relationships, coverage,
   missingness, and sensitivity before selecting the parsing approach.
2. Collect and normalize; qualify role fidelity, ordering, duplicate/fork
   overlap, missing turns, truncated outputs, summary substitutions, and
   references to unavailable artifacts.
3. Locate candidate episodes and retain enough surrounding exchange to see
   what changed. Use retrieval aids without making keywords the sole sample.
4. Analyze governing intent separately from the transferable collaboration
   method, including disagreement, vocabulary change, scope, and supersession.
5. Develop candidate skills and test them on withheld contextual cases. Judge
   improved decisions and boundaries, not fluent restatements of principles.
6. Review findings and tested guidance with the owner; revisit the philosophy
   and assessment before proposing SDK repair work.

The dedicated phase should choose schemas, tools, sampling, evaluation tasks,
and acceptance criteria after inspecting actual data. These stages do not
preselect an elaborate data platform or require building new infrastructure.

## Interpretation Safeguards

- Human statements establish expressed intent; agent paraphrases establish
  the agent's understanding. Neither alone proves working implementation.
- Silence, continuation, repeated agent claims, and matching specs/code/tests
  are not independent evidence of human endorsement.
- A later decision following an intervention does not by itself prove causality.
  Record observable changes and alternative explanations.
- Preserve contemporaneous meaning. Do not project today's philosophy backward
  or silently resolve conflicting historical frames.
- Include failed reframings, corrections that did not alter decisions, decisions
  reached without intervention, and justified Habitat abstractions. Do not
  collect only examples supporting the current repair thesis.
- Distinguish human from agent vocabulary. Keyword bags are both retrieval aids
  and possible evidence, not automatic proof of a conceptual shift.
- Existing framing/investigation/data skills can help conduct the work; their
  taxonomies are not the method being recovered and should not predetermine it.
- Preserve private raw histories outside committed docs by default. Decide
  retention, scoped excerpts, redaction, and durable provenance deliberately.
- Hold out whole episodes or related branches to avoid copied-context leakage.
  The release conversation has already influenced this assessment and cannot
  be called a pristine held-out dataset without qualification.

## Not Started

No historical extraction, complete-thread ingestion, full investigation design,
skill authoring, SDK redesign, repair implementation, or renewed execution of
old plans happened in this precursor. [T-1](triage.md#t-1-recover-and-validate-the-collaborative-framing-method)
remains the entry point for the later dedicated phase.
