# Agent Team Prompt: Extract Spec-System Invariants Into a Specification

Use this prompt for the agent team that will turn the extracted RAWR specification-system invariants into a standalone specification.

````markdown
You are the agent team responsible for producing the standalone **RAWR Specification System** companion specification for the RAWR final architecture migration.

## Mission

Create a specification, not a research report and not a planning memo. The output should define the corpus-level rules that govern how RAWR architecture specifications relate to one another: hub/companion structure, authority ownership, attachment protocol, reserved boundaries, deferral-vs-gap discipline, supersession/stale-copy handling, and the rules that prevent one document from silently redefining another document's ontology or mechanics.

The goal is to simplify the final Platform Architecture Specification. The platform spec should remain the platform hub, but it should not carry the entire specification-governance system inline. Your specification becomes the companion authority for those corpus rules.

## Frame

The working split is settled unless you find direct contradictory evidence:

- `frozen` is the structural baseline for the final Platform Architecture Specification.
- `_inbox/latest` is a harvest source, not the baseline.
- The runtime realization spec is the authority for runtime mechanics and settled runtime execution decisions.
- The new RAWR Specification System spec is the authority for cross-spec governance.

In shorthand:

```text
platform spec = frozen structural baseline
  + latest hub/framing/authority improvements
  + runtime spec's settled execution decisions
  - latest's over-promotion of runtime mechanics into platform ontology
```

Do not re-litigate this split unless new evidence directly contradicts it.

## Source Pack

Read these files first:

- `docs/projects/rawr-final-architecture-migration/workstreams/platform-architecture-finalization/integrated-updated-plan.md`
- `docs/projects/rawr-final-architecture-migration/workstreams/platform-architecture-finalization/integration-delta-change-doc.md`
- `docs/projects/rawr-final-architecture-migration/workstreams/platform-architecture-finalization/draft-verbatim-prior-plan.md`
- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`
- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
- `/Users/mateicanavra/Documents/projects/RAWR/_inbox/RAWR_System_Architecture_Canonical_Spec_Latest.md`

Treat `_inbox/latest` as provenance and harvest material. Do not copy it wholesale.

## Authority Ladder

When sources disagree, use this ladder:

1. Repo canonical/current specs on the active worktree, especially the frozen platform baseline and the runtime realization spec.
2. The integrated updated plan and delta change doc for this workstream's settled direction.
3. `_inbox/latest` only as a harvest source for useful framing, vocabulary, and candidate rules.
4. Older `main`, stale inbox copies, or research artifacts only as provenance unless they are explicitly revalidated.

Preserve epistemic status. If something is reserved, flexible, expected, or not final, keep that marker. Do not sanitize uncertainty into false authority.

## Hard Invariants To Extract

Your specification must define these invariants clearly:

- Hub/companion model: what a hub spec owns, what companion specs own, and how companion specs attach.
- Cross-spec authority ownership: every architectural truth has an owner; no document gets silent authority by being more detailed.
- Attachment protocol: how a companion spec declares scope, parent, boundary, authority, and what it deepens.
- Reserved-boundary rules: how reserved areas are named and protected from accidental implementation or speculative design.
- Deferral-vs-gap discipline: distinguish intentionally deferred decisions from missing design work.
- Supersession and stale-copy handling: how specs become obsolete, harvested provenance, or current authority.
- Companion-spec deepening rule: a companion spec may deepen a boundary but may not redefine hub ontology or another spec's mechanics unless the authority transfer is explicit.
- Platform/runtime split: the platform spec owns ontology, laws, vocabulary, boundaries, handoffs, and attachment points; the runtime realization spec owns runtime mechanics.
- Runtime noun placement: runtime nouns may appear in the platform spec only as integration-facing boundary references, not as top-level platform ontology or copied mechanics.
- Names-versus-mechanics rule: naming a runtime mechanism in a hub spec does not transfer ownership of its mechanics to the hub.

## Team Structure

If multiple agents are available, use this structure. If you are a single agent, simulate the roles sequentially and keep their outputs distinct until synthesis.

- **Spec-System Orchestrator**: accountable for the final specification. Maintains the authority ladder, decides when evidence is sufficient, and owns the final coherence pass.
- **Invariant Extractor**: reads the source pack and extracts candidate rules, preserving source anchors and epistemic status.
- **Boundary Reviewer**: checks that platform, runtime, and spec-system authority stay separated. Flags runtime mechanics that accidentally leak into corpus governance or platform ontology.
- **Specification Editor**: turns the extracted invariants into normative spec prose with clear sections, definitions, rules, and examples.
- **Red-Team Reviewer**: looks for false authority, vague ownership, hidden conflicts, stale-copy confusion, and rules that cannot be applied by a future agent.

Interfaces:

- The Invariant Extractor hands the editor a table of `rule`, `source`, `authority owner`, `status`, and `destination section`.
- The Boundary Reviewer hands the orchestrator a list of boundary violations and proposed fixes.
- The Specification Editor hands the Red-Team Reviewer a complete draft, not fragments.
- The Red-Team Reviewer returns actionable findings with severity and exact section references.
- The Orchestrator owns the final accept/revise decision and produces the final document.

## Required Output Shape

Produce a standalone markdown specification with sections equivalent to:

1. Status and Authority
2. Purpose and Scope
3. Definitions
4. Specification Corpus Model
5. Hub Specification Rules
6. Companion Specification Rules
7. Authority Ownership and Delegation
8. Attachment Protocol
9. Reserved Boundaries, Deferrals, and Gaps
10. Supersession, Harvesting, and Stale Copies
11. Platform/Runtime Boundary Rules
12. Runtime Noun Placement Rules
13. Review Gates and Failure Modes
14. Open Questions or Reserved Decisions

Use examples only where they clarify a rule. Examples must not introduce new authority beyond the rule they illustrate.

## Non-Goals

- Do not write the final Platform Architecture Specification.
- Do not rewrite the runtime realization spec.
- Do not turn `_inbox/latest` into the baseline.
- Do not copy runtime mechanics into the spec-system document.
- Do not make research/provenance artifacts canonical by accident.
- Do not hide open questions inside polished prose.

## Success Checks

Before delivering, run these checks:

- Every rule has a clear authority owner.
- Every companion-spec rule names what the companion may deepen and what it may not redefine.
- Every runtime noun is either excluded, treated as a boundary reference, or assigned to the runtime spec.
- Reserved decisions are distinguishable from missing work.
- Stale/provenance/current authority states are explicit.
- The platform spec can link to this document instead of carrying the full corpus-governance model inline.
- A future agent can apply the rules without needing this prompt.

Deliver the final specification plus a short change note listing the source documents used, any unresolved questions, and any places where you intentionally preserved uncertainty.
````
