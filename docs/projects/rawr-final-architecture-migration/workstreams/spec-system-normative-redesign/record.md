# Specification System Normative Redesign Workstream

Status: closed.
Branch: `codex/spec-system-normative-redesign`.
Directly responsible agent (DRA): Codex.
Date: 2026-05-08.

This record is durable workstream state. It is not specification authority.

## Frame

Objective: redo `RAWR_Specification_System_Spec.md` from the ground up as a generally applicable normative reference specification for the RAWR specification system.

The redesigned specification must help future agents produce high-quality hub specs, companion specs, addenda, and related specification artifacts across any workstream without needing repeated correction.

Hard core:

- The normative spec has one main point: define the rules that make RAWR specifications clear, composable, durable, and authority-safe.
- It must not be overfit to the current platform/runtime finalization workstream.
- It must not mix normative reference content with operational workflow instructions or temporal workstream inventories.
- It must include explicit style, anti-pattern, and document-composition invariants.
- It must make implicit composition rules explicit without becoming a process checklist.
- Operational guidance belongs in a separate informative companion document if it is useful.
- Temporal inventories belong in workstream records, decision packets, or other non-normative artifacts.

Falsifier:

- If the final normative spec still contains current-workstream-specific platform/runtime cleanup, temporal decision inventories, or operational execution checklists as normative content, the workstream has failed.
- If a future spec author cannot use the normative spec to understand how to write, structure, scope, and compose a high-quality RAWR spec, the workstream has failed.

## Input Typing

Opening/control input:

- User request dated 2026-05-08 to redo the RAWR Specification System Spec from the ground up.

Authority inputs:

- `docs/DOCS.md` for repository documentation roles and normative/canonical vocabulary.
- The user's explicit constraints for this redesign.

Evidence inputs:

- Current `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Specification_System_Spec.md`.
- Prior optimization review notes and red-team artifacts.
- Two read-only review agents for opposing perspectives.

Stale or excluded inputs:

- Current platform/runtime-specific cleanup context is evidence for what to remove or relocate, not normative source material.
- Workstream inventories and current decision lists are not allowed inside the new normative spec.

## Team Design

DRA: owns framing, synthesis, edits, finding disposition, verification, repo state, and closure.

Review agents:

- Normative purist / specification-boundary critic: finds overfit, operational leakage, invented warnings, and temporal content.
- Practical spec author / future-agent usability reviewer: checks whether the spec actually teaches agents to write better specs without becoming operational process.

Composition:

- Agents are read-only reviewers.
- The DRA writes and repairs.
- Findings are evidence candidates until dispositioned.

## Phase Plan

1. Frame and diagnose the current draft.
2. Run opposing-angle read-only reviews.
3. Rewrite the normative spec from the ground up.
4. Extract useful operational guidance into an informative companion document if needed.
5. Run review loops on both artifacts.
6. Repair accepted findings.
7. Verify, record closure, commit, and leave Graphite clean.

## Output Contract

Required:

- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Specification_System_Spec.md`
- `docs/projects/rawr-final-architecture-migration/workstreams/spec-system-normative-redesign/record.md`

Conditional:

- Informative companion document for operational authoring guidance if useful current-draft content should be preserved outside the normative spec.

## Review Lanes

Leaf lanes:

- Normative boundary: checks overfit, operational/temporal leakage, invented problem warnings, and authority coherence.
- Author usability: checks writing rules, style rules, anti-patterns, composition invariants, and future-agent applicability.

Composed lane:

- Closure review: checks whether the final normative spec is concrete, general, coherent, non-operational, non-temporal, and referenceable.

## Findings

Accepted and repaired:

- P1: Prior draft overfit the normative spec to platform/runtime and current migration cleanup. Repaired by removing platform/runtime application profile, current reserved decision inventory, and domain-specific cleanup language from the normative spec.
- P1: Prior draft did not teach agents how to write specs. Repaired by adding normative language rules, required composition, style anti-patterns, document-composition invariants, layer/no-magic rules, exactness rules, and a quality bar.
- P1: Prior draft mixed normative law with operational corpus management. Repaired by moving authoring flow, shape prompts, and relocation guidance into an informative companion.
- P2: Companion used `Minimum structure` language that could act like shadow normativity. Repaired by renaming to `Common starting shape` and stating that normative minima live only in the spec.
- P2: Normative spec required examples/references for every spec. Repaired by making examples/references conditional and subordinate.
- P3: Acronym `DRA` appeared without definition. Repaired by spelling out `directly responsible agents`.
- P3: Companion called itself operational. Repaired by calling it an informative authoring companion.
- P3: Durable rule used workstream-flavored `will/won't be in the final spec` language. Repaired as domain-specific inclusion/exclusion decisions outside the owned domain.

Rejected:

- None.

Waived:

- None.

## Deferred Inventory

- None.

## Gates

Run:

- `git diff --check`
- Manual cold-read scenarios passed by DRA/review loops:
  - future hub spec author;
  - future companion spec author;
  - future addendum author;
  - reviewer checking overfit/context leakage;
  - reviewer checking collapsed-layer examples.

## Next Packet

Continuation target: downstream platform architecture finalization work.

Inspect first:

- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Specification_System_Spec.md`
- `docs/projects/rawr-final-architecture-migration/resources/research/RAWR_Specification_System_Authoring_Companion.md`

Use the normative spec as the durable specification-writing authority. Use the authoring companion only as informative operational guidance. Do not re-import platform/runtime application profiles, current decision inventories, source-freeze details, or review-loop mechanics into the normative spec.
