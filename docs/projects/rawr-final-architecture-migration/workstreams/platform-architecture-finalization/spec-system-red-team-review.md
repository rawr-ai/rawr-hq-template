# RAWR Specification System Red-Team Review

Status: DRA red-team review. Specialist red-team lane may add findings; DRA dispositions remain authoritative for this workstream.

Review target: `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Specification_System_Spec.md`

Forbidden scope: do not reopen platform/runtime architecture, do not invent new companion specs, do not require repo-wide stale-copy cleanup inside this workstream.

## Findings

### Finding R1: False Authority Through Polished Harvest Language

Evidence: `_inbox/latest` has stronger hub-document language and useful deferral/gap wording, but the workstream frame classifies it as harvest/provenance, not baseline.

Severity: `P1`

Disposition: `accepted`

Confidence: high

Repair demand: The final spec must say harvesting is not promotion and must require adopt/adapt/reject/defer classification.

Record section target: Review Result; Next Packet.

Next Packet consequence: Downstream platform finalization must run a harvest matrix before transplanting `_inbox/latest` language.

Repair status: repaired in `RAWR_Specification_System_Spec.md` §10.

### Finding R2: More-Detailed Companion Could Appear To Outrank Its Owner

Evidence: Runtime realization spec is much more detailed than the platform spec, but platform §4.3a says the architecture spec owns integration vocabulary while runtime owns mechanics. Detail must not create authority.

Severity: `P1`

Disposition: `accepted`

Confidence: high

Repair demand: Make "detail does not create authority" a top-level corpus rule and include conflict-resolution steps for owner disagreements.

Record section target: Output Contract; Review Result.

Next Packet consequence: Future companion specs must be reviewed for silent authority expansion.

Repair status: repaired in `RAWR_Specification_System_Spec.md` §§4 and 7.

### Finding R3: Examples And Tables Could Smuggle New Rules

Evidence: The prompt explicitly says examples must not introduce authority beyond the rule they illustrate. Runtime spec uses exactness labels to distinguish normative and illustrative material.

Severity: `P2`

Disposition: `accepted`

Confidence: high

Repair demand: Add an example/exactness review gate and require exactness labels where examples, diagrams, generated excerpts, or tables could be misread as law.

Record section target: Review Result.

Next Packet consequence: Future specs should label illustrative examples and generated views.

Repair status: repaired in `RAWR_Specification_System_Spec.md` §§8 and 13.

### Finding R4: Attachment Protocol Could Be Too Abstract For Future Agents

Evidence: The prompt requires future agents to apply the rules without needing the prompt. A conceptual discussion of attachment is not enough.

Severity: `P2`

Disposition: `accepted`

Confidence: medium-high

Repair demand: Include a concrete attachment declaration template with parent hub, boundary, owned concern, forbidden concerns, authority owner, deepening, non-redefinition, runtime-shaped claims, reserved boundaries, supersession/harvest/subordination, and review gates.

Record section target: Output Contract.

Next Packet consequence: Future companion specs can copy the declaration shape directly.

Repair status: repaired in `RAWR_Specification_System_Spec.md` §8.

### Finding R5: Open Questions Could Be Hidden As "Reserved" Without Owner

Evidence: Workstream plan calls out runtime noun list, platform/deployment external-interface lock point, OpenShell governance/vendor details, and repo-wide stale-copy cleanup as not part of this workstream. These need explicit reserved/deferred handling.

Severity: `P2`

Disposition: `accepted`

Confidence: high

Repair demand: Open questions must be listed as not settled by this spec, with downstream decision-packet instructions.

Record section target: Deferred Inventory; Next Packet.

Next Packet consequence: Downstream work must create decision packets rather than hiding questions in prose.

Repair status: repaired in `RAWR_Specification_System_Spec.md` §14 and record deferred inventory.

### Finding R6: Workstream Method Could Leak Into Specification System

Evidence: Workstream Runner says phases, waves, lanes, companion agents, and review loops are internal mechanics inside one workstream. The spec-system document should not define generic workstream methodology.

Severity: `P2`

Disposition: `accepted`

Confidence: high

Repair demand: Keep workstream phases and review mechanics in `record.md` and review artifacts, not in the normative corpus-governance spec except as generic review gates.

Record section target: Frame; Workflow.

Next Packet consequence: Future workstream docs remain Habitat-owned, not spec-system-owned.

Repair status: repaired by keeping workstream execution design out of `RAWR_Specification_System_Spec.md`.

### Finding R7: Canonical Home And Status Are Ambiguous

Evidence: The draft called itself companion authority while living only in the workstream directory. `docs/DOCS.md` defines `docs/projects/<project>/resources/spec/` as the location for project-scoped normative specs and guardrails.

Severity: `P1`

Disposition: `accepted`

Confidence: high

Repair demand: Place the normative spec under `resources/spec/` or explicitly mark it workstream-draft/provenance pending promotion. Leave only a non-authority pointer in the workstream directory if the original artifact path needs continuity.

Record section target: Final Output; Next Packet.

Next Packet consequence: Downstream platform-spec finalization should read the `resources/spec/` copy, not the workstream pointer.

Repair status: repaired by moving the normative spec to `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Specification_System_Spec.md` and replacing the workstream-local file with a non-authority pointer.

### Finding R8: Workstream-Specific Authority Ladder Could Become Universal Corpus Law

Evidence: The extraction prompt's source ladder was scoped to this workstream. Future specs should not inherit `_inbox/latest`, current branch state, or the workstream plan docs as standing authority.

Severity: `P1`

Disposition: `accepted`

Confidence: high

Repair demand: Split the general owner-first authority model from this workstream's source ladder. Keep the source ladder in the source note, not as a universal rule.

Record section target: Output Contract; Source Note.

Next Packet consequence: Future specs should use owner-first authority and local source classification, not this workstream's source order.

Repair status: repaired in `RAWR_Specification_System_Spec.md` §1 and `spec-system-source-note.md`.

### Finding R9: Scope Overreaches Toward Docs And Workstream Governance

Evidence: The draft definition of specification corpus included workstream packets. `docs/DOCS.md` owns documentation architecture, and Habitat owns generic workstream methodology.

Severity: `P2`

Disposition: `accepted`

Confidence: high

Repair demand: Narrow scope to RAWR architecture/specification authority relationships. Explicitly avoid superseding docs architecture, process docs, and generic workstream methodology.

Record section target: Frame; Output Contract.

Next Packet consequence: Future docs/process changes must route through their owning docs/process authorities.

Repair status: repaired in `RAWR_Specification_System_Spec.md` §§2-3.

### Finding R10: Runtime Cleanup Questions Need Reserved/Open Handling

Evidence: The integrated plan names `SurfaceRuntimeAccess`, Effect-prefixed semantic-kind language, platform/deployment external-interface lock point, and OpenShell governance/vendor details as low-confidence cleanup items.

Severity: `P2`

Disposition: `accepted`

Confidence: high

Repair demand: Name these items as open/reserved and prevent the spec-system companion from silently settling them.

Record section target: Deferred Inventory; Next Packet.

Next Packet consequence: Downstream platform spec work must either decide these explicitly or carry them as reserved/open decisions.

Repair status: repaired in `RAWR_Specification_System_Spec.md` §§12 and 14.

### Finding R11: Stale-Copy Cleanup Needs A Concrete Deferred Item

Evidence: The draft says repo-wide stale cleanup is out of scope, but valid deferral requires continuation context.

Severity: `P2`

Disposition: `accepted`

Confidence: high

Repair demand: Add a deferred-inventory entry naming future DRA, authority home, evidence needed, unblock condition, trigger, and continuation target.

Record section target: Deferred Inventory; Next Packet.

Next Packet consequence: Future cleanup work can resume from an explicit deferred item rather than prose.

Repair status: repaired in `record.md` Deferred Inventory.

### Finding R12: Attachment Protocol Needs Cold-Use Registry Fields

Evidence: Platform §10.14 records boundary name, arch section, runtime section, naming owner, mechanics owner, contract types, and companion specs. The initial template was looser.

Severity: `P2`

Disposition: `accepted`

Confidence: high

Repair demand: Add exact parent path, hub section/registry row, owning spec section, naming owner, mechanics owner, and conflict-resolution owner to the attachment declaration.

Record section target: Output Contract.

Next Packet consequence: Future companion specs can use the template without reverse-engineering platform §10.14.

Repair status: repaired in `RAWR_Specification_System_Spec.md` §8.

## Red-Team Verdict

The reviewed spec is usable as a cold reference after accepted repairs. The canonical home is now under `resources/spec/`; the workstream path is a non-authority pointer. The spec still intentionally leaves exact runtime noun allow-list finalization and related cleanup questions open; those are recorded as reserved/open decisions rather than hidden in polished prose.

No accepted P1/P2 red-team finding remains unrepaired.
