# RAWR Specification System Boundary Review

Status: DRA review with read-only specialist-lane input integrated where available.

Scope: Platform/runtime/spec-system authority separation for `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Specification_System_Spec.md`.

Forbidden scope: redesigning platform architecture, rewriting runtime realization mechanics, or turning workstream mechanics into generic corpus law.

## Review Lanes

| Lane | Evidence base | Required output |
| --- | --- | --- |
| Canonicality Boundary | Platform spec, runtime spec, `_inbox/latest`, extraction table | Findings on ownership confusion and authority leaks |
| Implicitness and Gap Coverage | Runtime spec structure and repeated conventions | Candidate implicit rules and missing-rule findings |
| Stale/Provenance Handling | Runtime authority note, runtime stale-source section, workstream authority ladder | Findings on current/provenance/stale classification |

## Findings

### Finding B1: Runtime Mechanics Could Leak Into Corpus Governance

Evidence: `integration-delta-change-doc.md` warns against `_inbox/latest` over-promoting runtime mechanics into platform ontology; `RAWR_Canonical_Architecture_Spec.md` §4.3a assigns mechanics to the runtime realization spec; `RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md` owns descriptor, registry, provider, harness, diagnostic, and component contracts.

Severity: `P1`

Disposition: `accepted`

Confidence: high

Repair demand: The spec-system document must route runtime mechanics to the runtime realization spec and limit itself to corpus routing rules. It must include runtime noun placement rules that distinguish boundary references from runtime-owned mechanics.

Record section target: Output Contract; Review Result.

Next Packet consequence: Downstream platform finalization must use the runtime noun placement rules before harvesting `_inbox/latest` runtime language.

Repair status: repaired in `RAWR_Specification_System_Spec.md` §§11-12.

### Finding B2: Spec-System Authority Could Overclaim Canonical Status Before Adoption

Evidence: The workstream prompt says the new spec becomes companion authority for cross-spec governance, but the platform spec has not yet been rewritten to link to it. The workstream output itself must not imply it owns platform ontology or runtime mechanics.

Severity: `P2`

Disposition: `accepted`

Confidence: medium-high

Repair demand: State authority scope precisely: cross-spec governance within the Platform Architecture Finalization workstream; no platform ontology, runtime mechanics, or future-companion mechanics ownership.

Record section target: Frame; Output Contract.

Next Packet consequence: Platform finalization should explicitly link or move the companion into the eventual spec index if desired.

Repair status: repaired in `RAWR_Specification_System_Spec.md` §§1-2 and open questions.

### Finding B3: Runtime-Spec Metadata Pattern Should Not Become Heavy Ceremony For Every Spec

Evidence: Runtime realization spec repeatedly uses `File`, `Layer`, and `Exactness` labels to protect examples and type blocks. That pattern is useful, but future prose-heavy companion specs may not need full metadata on every paragraph.

Severity: `P2`

Disposition: `accepted`

Confidence: medium

Repair demand: Require exactness labels only for diagrams, generated examples, schema/type/code excerpts, and contract tables where illustrative material could be mistaken for normative law.

Record section target: Review Result.

Next Packet consequence: Future companion specs should label exactness where examples or diagrams can become accidental authority.

Repair status: repaired in `RAWR_Specification_System_Spec.md` §§8 and 13.

### Finding B4: Evidence Surfaces Must Not Become Authority By Visibility

Evidence: Runtime spec defines diagnostics/catalogs as observation/read-model surfaces that do not compose app membership, mutate runtime state, or become live authority. This pattern applies to corpus indexes, ledgers, semantic graphs, generated summaries, review reports, and dashboards.

Severity: `P2`

Disposition: `accepted`

Confidence: high

Repair demand: Add a corpus read-model rule: indexes, reports, diagnostics, ledgers, semantic graphs, and generated summaries are evidence/read models unless explicitly promoted by an owner.

Record section target: Output Contract; Review Result.

Next Packet consequence: Downstream doc-index or semantic-graph work must classify evidence surfaces before agents rely on them.

Repair status: repaired in `RAWR_Specification_System_Spec.md` §§4 and 13.

### Finding B5: Reserved Boundary Rules Need Trigger Discipline

Evidence: `_inbox/latest` §19.2 and runtime spec §23.5 both require reserved boundaries to name owner, hook, input/output contract, diagnostics/enforcement, and trigger. `_inbox/latest` §19.3 states that silence without those elements is a gap.

Severity: `P1`

Disposition: `accepted`

Confidence: high

Repair demand: The final spec must make reserved/deferral/gap distinctions normative and testable.

Record section target: Output Contract; Review Result.

Next Packet consequence: Future agents must not file missing design under "reserved" without owner and trigger.

Repair status: repaired in `RAWR_Specification_System_Spec.md` §9.

## Boundary Verdict

The draft spec preserves the intended authority split after repairs:

- Spec-system companion owns corpus governance.
- Platform spec owns platform ontology, laws, vocabulary, boundaries, handoffs, and attachment points.
- Runtime realization spec owns runtime mechanics.
- `_inbox/latest` remains harvest/provenance.

No accepted P1/P2 boundary finding remains unrepaired.
