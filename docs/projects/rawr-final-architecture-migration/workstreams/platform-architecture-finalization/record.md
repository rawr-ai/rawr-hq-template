# Platform Architecture Finalization Workstream

Status: `closed`.
Branch: `codex/platform-spec-finalization`.
PR: `none`.
Commit: `see git history after closure`.
DRA: `Codex`.
Dates: `2026-05-07 -> 2026-05-07`.

This record preserves state and handoff context for one bounded workstream. It is not architecture authority, product authority, a program definition, sequence authority, or a live task board.

## Workstream State

Workstream record path: `docs/projects/rawr-final-architecture-migration/workstreams/platform-architecture-finalization/record.md`

Status: closed.

DRA: Codex is the directly responsible agent for scope, synthesis, authority calls, finding disposition, final prose, repo state, and closure.

Branch/stack: `codex/platform-spec-finalization`; preflight `gt status` showed a clean worktree on this branch.

Current phase: closed.

Selected skills:

- `habitat:workstream-runner`
- `habitat:workstream-review-loops`
- `cognition:team-design`

Selected agents:

- DRA/local orchestrator: Codex.
- Phase-local specialist agents may be used for extraction, boundary review, gap review, and red-team review.
- Agent outputs are evidence candidates until accepted by the DRA.

Selected hooks: none.

## Frame

Objective: Produce a reliable, standalone **RAWR Specification System** companion specification that future agents can use cold while drafting, aligning, or reviewing downstream RAWR architecture specifications.

Containment boundary: This workstream owns the spec-system companion specification and its extraction/review evidence inside `docs/projects/rawr-final-architecture-migration/workstreams/platform-architecture-finalization/`. It may read canonical platform/runtime specs and `_inbox/latest`; it does not rewrite those specs.

Primitive boundary: This is one bounded workstream, not a program or parent container. Phases, waves, lanes, companion agents, and review loops are internal mechanics. The DRA owns synthesis, authority order, proof claims, finding disposition, repo state, closure, and handoff.

Non-goals:

- Do not write the final Platform Architecture Specification.
- Do not rewrite the runtime realization spec.
- Do not promote `_inbox/latest` into baseline authority.
- Do not implement code migration or repo-wide stale-copy cleanup beyond documenting follow-up triggers.
- Do not create generic workstream methodology content.

Done means:

- The final spec is normative, not a research report or planning memo.
- The platform spec can link to it instead of carrying corpus-governance rules inline.
- Every rule has an owner and a current/provenance/reserved/deferred status.
- Companion specs can apply the attachment protocol without needing the original prompt.
- Runtime mechanics stay in the runtime realization spec; platform ontology stays in the platform spec; corpus governance lives in the new spec-system companion.
- All material review findings are dispositioned and accepted P1/P2 findings are repaired or explicitly waived/deferred.

## Opening Packet

Opening input:

- User-approved plan titled `RAWR Specification System Workstream Plan`.
- `agent-team-invariants-to-spec-prompt.md`, which defines the mission and required output shape for extracting spec-system invariants into a standalone specification.

Authority inputs:

- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`
- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
- `docs/projects/rawr-final-architecture-migration/workstreams/platform-architecture-finalization/integrated-updated-plan.md`
- `docs/projects/rawr-final-architecture-migration/workstreams/platform-architecture-finalization/integration-delta-change-doc.md`
- `docs/projects/rawr-final-architecture-migration/workstreams/platform-architecture-finalization/agent-team-invariants-to-spec-prompt.md`

Authority order:

1. Repo canonical/current specs in this worktree, especially `RAWR_Canonical_Architecture_Spec.md` and `RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`.
2. `integrated-updated-plan.md`, `integration-delta-change-doc.md`, and `agent-team-invariants-to-spec-prompt.md`.
3. `/Users/mateicanavra/Documents/projects/RAWR/_inbox/RAWR_System_Architecture_Canonical_Spec_Latest.md` as harvest/provenance for useful framing and candidate rules.
4. Older, archived, quarantined, or external copies only if explicitly revalidated.

Coordination inputs:

- `draft-verbatim-prior-plan.md`
- This workstream record.
- Workstream runner/review-loop/team-design skills.

Evidence inputs:

- Source-anchored invariant extraction table.
- Boundary review.
- Red-team review.
- Source note.
- Verification output.

Excluded or stale inputs:

- `_inbox/latest` is not baseline authority.
- Older `main`, archived, quarantined, downloaded, or historical copies are provenance only unless explicitly revalidated.
- Generated summaries, prior chat, or memory notes may orient but do not decide authority.

Control inputs:

- User instruction: "PLEASE IMPLEMENT THIS PLAN".
- Any later explicit user retarget, pause, abandon, or authority decision.

Stop/escalation conditions:

- Stop for an authority conflict that cannot be resolved from the source pack without making a new architecture decision.
- Stop if unrelated dirty changes affect target docs or spec authority surfaces.
- Do not stop for routine wording, artifact organization, extraction classification, or mechanical cleanup.

## Output Contract

Required outputs:

- `record.md`: durable state, decisions, findings, gates, closure, and Next Packet.
- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Specification_System_Spec.md`: final standalone companion spec.
- `RAWR_Specification_System_Spec.md`: non-authority workstream pointer to the final spec path.
- `spec-system-invariant-extraction-table.md`: source-anchored rule table.
- `spec-system-boundary-review.md`: platform/runtime/spec-system boundary findings and repairs.
- `spec-system-red-team-review.md`: adversarial findings and DRA dispositions.
- `spec-system-source-note.md`: short source/change note for the final spec.

Optional outputs: none planned.

Claim strength / evidence class:

- `normative-current`: current repo authority or DRA synthesis directly supported by current authority inputs.
- `harvest-candidate`: useful `_inbox/latest` language/rule candidate that needs placement and authority owner.
- `reserved`: named boundary with owner, hook/contract, and lock trigger, but intentionally not finalized.
- `deferred`: valid follow-up with owner/future DRA, authority home, evidence needed, and trigger.
- `stale/provenance`: source may explain history but cannot decide current authority.
- `conflict-needs-DRA`: source tension requiring DRA judgment or user escalation.

Surfaces touched:

- `docs/projects/rawr-final-architecture-migration/workstreams/platform-architecture-finalization/*`
- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Specification_System_Spec.md`

Expected gates:

- `git diff --check`
- `gt status`
- Manual cold-read acceptance checks recorded in this record.

## Workflow

Preflight:

- Confirmed branch: `codex/platform-spec-finalization`.
- Confirmed worktree clean via `git status --short --branch` and `gt status`.
- Confirmed current commit: `2d1f149a`.

Investigation lanes:

- Explicit invariant extraction from prompt, plan, delta note, platform spec, and `_inbox/latest`.
- Implicit convention extraction from runtime realization spec structure.
- Platform/runtime/spec-system boundary review.
- Red-team review against false authority, stale-copy confusion, vague ownership, and unusable rules.

Phase teams:

1. Opening Steward Wave: objective, boundaries, authority order, stale inputs, stop conditions.
2. Extraction Pair Wave: explicit platform/latest rules and runtime implicit structure.
3. Outside-In Gap Pair Wave: unspoken conventions and future-agent failure modes.
4. Boundary Review Wave: platform/runtime/spec-system separation.
5. Specification Editor Wave: standalone normative markdown spec.
6. Red-Team Review Wave: P1/P2/P3 findings with exact section references.
7. DRA Repair and Closure Wave: dispositions, repairs, gates, final state, Next Packet.

Design lock:

- Orchestrator + specialists topology.
- Objective precision: specified/verifiable.
- Coupling: moderate; extraction lanes parallelize, final synthesis is tightly coupled.
- Autonomy: empowered inside guardrails; authority conflicts escalate to DRA.
- Composition stability: fluid; packets must be self-contained.
- Context distribution: layered and partitioned with shared authority order.
- Verification mode: process-traced for extraction/review; outcome-checked for final spec usability.

Agent packets:

- Agent packets may be embedded in subagent prompts. They must name authority order, evidence paths, forbidden scope, output artifact, required output, and DRA decision point.

Wave packets:

- Wave outputs must target this record and the named artifact files. They are evidence candidates until DRA disposition.

Scratch policy:

- Scratch stays local to the workstream or subagent. Before closure, all material scratch is integrated, discarded, or explicitly classified as provenance. No scratch becomes authority by accident.

## Findings

Findings are recorded in `spec-system-boundary-review.md`, `spec-system-red-team-review.md`, and summarized in the Review Result section.

## Outcome Record

Objective outcome: `achieved`.

Residual objective gaps:

- None blocking. Downstream open decisions are recorded in Deferred Inventory and in the spec's Open Questions section.

Implementation summary:

- Expanded this record from the prior short opening note into the full workstream state object.
- Added the project-scoped normative companion spec at `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Specification_System_Spec.md`.
- Left a non-authority pointer at `docs/projects/rawr-final-architecture-migration/workstreams/platform-architecture-finalization/RAWR_Specification_System_Spec.md` because the original workstream plan named that path before `docs/DOCS.md` confirmed project-scoped specs belong in `resources/spec/`.
- Added extraction, boundary review, red-team review, and source note artifacts in the workstream directory.

Decisions:

- Final companion spec lives under `resources/spec/` per `docs/DOCS.md`; the workstream-local file is a pointer, not authority.
- Use `_inbox/latest` as harvest/provenance, not baseline authority.
- Use runtime realization spec as the best structured view of implicit spec-system conventions.
- Use the general owner-first authority model in the companion spec; keep this workstream's source ladder in `spec-system-source-note.md`.

Evidence:

- `spec-system-invariant-extraction-table.md`
- `spec-system-boundary-review.md`
- `spec-system-red-team-review.md`
- `spec-system-source-note.md`
- Read-only specialist lanes for explicit extraction, runtime implicit conventions, and red-team review.

Verification:

- Preflight clean state recorded.
- `git diff --check` passed on final artifacts before closure.
- `gt status` was run before commit; dirty output was limited to this workstream's accepted artifacts.

## Deferred Inventory

Deferred items will use:

```text
Item:
Status:
Why deferred:
Owner or future DRA:
Authority home:
Evidence needed:
Unblock condition:
Re-entry trigger:
Continuation target:
Lane:
```

Item: Repo-wide stale-copy cleanup
Status: deferred
Why deferred: This workstream defines stale/provenance/current classification and follow-up triggers but does not perform repo-wide cleanup.
Owner or future DRA: future docs/spec cleanup DRA.
Authority home: `docs/DOCS.md`, `RAWR_Specification_System_Spec.md`, and the owning current spec for each stale-copy family.
Evidence needed: inventory of active, archived, quarantined, inbox, download, and external copies that still claim canonical/current status.
Unblock condition: downstream cleanup workstream is opened or platform finalization needs stale-copy containment before review.
Re-entry trigger: a future agent finds two apparent canonical sources for the same architecture claim.
Continuation target: stale-copy cleanup or platform finalization cleanup pass.
Lane: Stale/Provenance Handling.

Item: Final Platform Architecture Specification rewrite
Status: deferred
Why deferred: This workstream produces the spec-system companion, not the platform spec final lock.
Owner or future DRA: future Platform Architecture Specification finalization DRA.
Authority home: `RAWR_Canonical_Architecture_Spec.md`, `RAWR_Specification_System_Spec.md`, and the workstream harvest packet to be created downstream.
Evidence needed: final spec-system companion, `_inbox/latest` harvest matrix, runtime noun classification, conflict decision packet.
Unblock condition: downstream platform finalization workstream starts.
Re-entry trigger: need to integrate `_inbox/latest` language or link the platform hub to the spec-system companion.
Continuation target: platform spec harvest/reframe/final lock workstream.
Lane: Platform Finalization.

Item: Runtime noun cleanup decisions
Status: deferred
Why deferred: Exact runtime noun allow-list, `SurfaceRuntimeAccess` placement, and Effect-prefixed semantic-kind wording belong to platform/runtime finalization, not corpus-governance extraction.
Owner or future DRA: future platform/runtime boundary DRA.
Authority home: Platform Architecture Specification, Runtime Realization System specification, and `RAWR_Specification_System_Spec.md` runtime noun placement rules.
Evidence needed: final platform draft, runtime spec noun ownership, `_inbox/latest` candidate language, boundary review.
Unblock condition: platform spec wording needs to decide exact noun placement.
Re-entry trigger: `SurfaceRuntimeAccess`, `EffectService`, `EffectPlugin`, or similar runtime/Effect nouns appear in hub ontology or public platform prose.
Continuation target: conflict decision packet or platform spec runtime boundary scrub.
Lane: Runtime Noun Placement.

## Review Result

Leaf loops:

- Canonicality Boundary: accepted findings B1, B2, B4, B5 repaired.
- Implicitness and Gap Coverage: runtime implicit-convention lane integrated; exactness/read-model/status-scope rules added.
- Specification Usability: attachment declaration expanded; examples labeled informative; cold-read gates added.
- Stale/Provenance Handling: source-specific ladder moved to source note; deferred stale-copy cleanup item added.

Composed loops:

- Red-team review: accepted findings R1-R12 repaired or deferred with explicit owner/trigger.

Waivers:

- None.

Invalidations:

- None.

Repair demands:

- All accepted P1/P2 review findings repaired, waived, or deferred with owner/trigger.

Closure steward result:

- DRA closure check complete: final outputs exist, findings dispositioned, deferred inventory populated, Next Packet updated. Gate commands pending after record write.

## Final Output

Artifacts:

- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Specification_System_Spec.md`
- `docs/projects/rawr-final-architecture-migration/workstreams/platform-architecture-finalization/RAWR_Specification_System_Spec.md` (non-authority pointer)
- `docs/projects/rawr-final-architecture-migration/workstreams/platform-architecture-finalization/spec-system-invariant-extraction-table.md`
- `docs/projects/rawr-final-architecture-migration/workstreams/platform-architecture-finalization/spec-system-boundary-review.md`
- `docs/projects/rawr-final-architecture-migration/workstreams/platform-architecture-finalization/spec-system-red-team-review.md`
- `docs/projects/rawr-final-architecture-migration/workstreams/platform-architecture-finalization/spec-system-source-note.md`
- `docs/projects/rawr-final-architecture-migration/workstreams/platform-architecture-finalization/record.md`

Verification run:

- `git diff --check`: passed before closure.
- `gt status`: run before commit; dirty output was limited to accepted workstream artifacts.
- Manual cold-read checks passed by DRA after red-team repairs: owner model, attachment protocol, reserved/deferral/gap rules, stale-copy handling, and runtime noun placement are all discoverable from the spec without the prompt.

Repo/Graphite state:

- Opening state clean on `codex/platform-spec-finalization`.
- Closure commit is expected on `codex/platform-spec-finalization` after this record update.

## Next Packet

Continuation target: downstream Platform Architecture Specification finalization.

Successor workstream, if any: Platform spec harvest/reframe/final lock workstream.

Why this is next: The platform spec should reference the spec-system companion rather than carrying all corpus-governance rules inline.

Current branch/stack: `codex/platform-spec-finalization`.

What changed: Added the spec-system companion and supporting workstream artifacts.

What is done: Spec-system companion written, evidence table written, boundary/red-team reviews dispositioned, deferred inventory populated, source note written.

What is not done: Downstream platform spec rewrite, `_inbox/latest` harvest matrix, conflict decision packet, repo-wide stale-copy cleanup.

What to inspect first:

- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Specification_System_Spec.md`
- `spec-system-invariant-extraction-table.md`
- `spec-system-boundary-review.md`
- `spec-system-red-team-review.md`
- `spec-system-source-note.md`

Exact next action: Use the final spec-system companion as an authority input for the platform spec harvest/reframe work.

Required first reads:

- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Specification_System_Spec.md`
- `integrated-updated-plan.md`
- `RAWR_Canonical_Architecture_Spec.md`
- `RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`

First commands:

- `git status --short --branch`
- `gt status`

Deferred items to consume:

- Repo-wide stale-copy cleanup.
- Final Platform Architecture Specification rewrite.
- Runtime noun cleanup decisions.
