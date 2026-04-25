# Runtime Realization Final Spec Readiness Review Workflow

Status: Active workflow draft
Scope: Review of a returned final Runtime Realization System specification before deriving the migration plan

## Purpose

This workflow determines whether the returned Runtime Realization System specification is ready to become the baseline for migration planning.

The review is not another cloud synthesis run and is not a broad rewrite pass. It is a disciplined readiness review that verifies whether the document:

- properly carries forward the required baseline repairs and transplant material;
- stands alone as a cohesive canonical and normative specification;
- functions as a transparent runtime-realization blueprint;
- exposes internals clearly enough that authoring convenience is backed by concrete SDK, runtime, adapter, harness, and diagnostic mechanics;
- avoids collapsed layers, vague placeholders, and magic;
- is fit for the next step: deriving an M2 migration plan from the specification.

Success means the final verdict can answer one question directly:

```text
Can this specification become the migration-planning baseline now?
```

If the answer is no, the output must be a bounded repair report with exact locations, reasons, and proposed canonical replacements or reframes.

## Active Document Organization

This is the active review workflow for the final returned specification.

Earlier workflow documents have been moved to:

```text
docs/projects/rawr-final-architecture-migration/.context/M2-runtime-realization-lock-spike/past-session-workflows/
```

Those archived files are retained as past-session provenance only. They are not active instructions and are not review inputs unless a future user request explicitly reopens them for a bounded historical question.

## Authority Model

The returned specification is the review subject. It is not accepted as canonical authority until this workflow reaches a ready verdict.

The review uses the final cloud-Pro packet as evidence for what the returned specification was supposed to accomplish:

```text
docs/projects/rawr-final-architecture-migration/.context/M2-runtime-realization-lock-spike/final-cloud-pro-inputs/
  00-cloud-pro-task-prompt.md
  01-finalization-authority.md
  02-runtime-realization-architecture-authority.md
  03-baseline-runtime-realization-spec.md
  04-baseline-repair-map.md
  05-normalized-transplants.md
```

Authority order during review:

1. Original objective: a standalone canonical normative Runtime Realization System specification that owns the architecture in spec form.
2. Finalization Authority and Runtime Realization Architecture Authority.
3. Baseline Specification, Baseline Repair Map, and Normalized Transplants as evidence for expected carry-forward.
4. The returned specification as the candidate to accept, repair, or reject.

The review must not use prior agents, raw reports, old architecture specs, repo zips, chat transcripts, scratchpads, or current implementation reality as authority. The current repo can be used only to access the curated final cloud-Pro packet and to store review artifacts.

## Review Packet Freeze

Before launching reviewers, the DRI freezes the packet.

Record for the returned specification:

- stable review label;
- local file path;
- source note from the user;
- line count;
- byte count;
- SHA-256 hash.

Record for the reference packet:

- exact paths for prompt and five source inputs;
- line counts and hashes if the review needs reproducibility;
- note that archived workflow docs and prior scratch artifacts are excluded.

The DRI creates a scratch workspace for the review:

```text
.context/.scratch/runtime-realization-final-spec-review/
  README.md
  orchestrator.scratch.md
  extraction/
  agents/
  reports/
```

Scratch files are working memory. They are not future authority and are not cloud-agent inputs.

## Extraction Pass

The DRI performs an extraction pass before semantic review. Extraction is evidence, not a substitute for full reading.

Required extraction artifacts:

| Artifact | Purpose |
| --- | --- |
| Outline map | Show the document structure, section order, and major component boundaries. |
| Term and entity inventory | Capture runtime nouns, APIs, artifacts, layers, and repeated names. |
| Code and example inventory | List every code block, file/layer label, example type, and whether it is simple or realistic. |
| Blueprint coverage map | Map authoring, SDK derivation, runtime compilation/provisioning/binding, adapters, harnesses, diagnostics, and observation. |
| Transplant anchor scan | Check expected transplant material such as `WorkflowDispatcher`, telemetry, realization sequence, provider acquire/release, surface lanes, and shutdown-order language. |
| Runtime artifact scan | Check `RuntimeSchema`, `ServiceBindingCacheKey`, `FunctionBundle`, `RuntimeCatalog`, `RuntimeAccess`, `ProcessRuntimeAccess`, `RoleRuntimeAccess`, `ResourceRequirement`, `ResourceLifetime`, provider/profile contracts, and plugin factories. |
| Normative-language scan | Flag migration notes, process commentary, passive wording, optional language in load-bearing rules, future-work notes, TODOs, and provenance language. |
| Drift scan | Flag `exposure`/`visibility` classification fields, string schemas, live `View` nouns, stale package roots, `startAppRole`, rejected runtime package taxonomy, and top-level shutdown phase drift. |

The extraction pass should over-flag. The reviewers and DRI decide which flags are real issues.

## Team Design

Use a fresh team. Close or ignore prior agents and do not reuse prior agent conclusions as review authority.

Use default or higher-capability agents only. Do not use explorer agents for this review.

The team uses independent review plus one DRI integration decision. Agents advise; the DRI owns the final verdict.

### DRI / Orchestrator

Owner: main-thread lead agent.

Responsibilities:

- freeze the packet;
- create the scratch workspace;
- run extraction;
- launch reviewers with full context and bounded prompts;
- reject shallow reports and send them back for repair;
- independently verify blockers and high-risk claims;
- consolidate findings without averaging away hard lines;
- produce the final verdict and repair report if needed;
- keep the repository clean.

The DRI maintains:

```text
.context/.scratch/runtime-realization-final-spec-review/orchestrator.scratch.md
```

### Information Design And Normative Language Reviewer

Primary question:

```text
Is the document shaped and phrased like a canonical normative specification that a migration team can reliably use?
```

Required skills:

- information-design;
- target-authority-migration as support for authority separation.

Focus:

- clarity and navigability;
- canonical phrasing consistency;
- active versus passive language;
- migration notes or process notes embedded in the spec;
- non-normative sections that should be removed, moved, or reframed;
- overloaded terms or renamed concepts;
- sections that sound explanatory but fail to impose a rule;
- headings that hide load-bearing content.

Output must include exact phrases that could cause drift and proposed canonical replacements where possible.

### Architecture And Target-Authority Reviewer

Primary question:

```text
Does the document preserve the locked Runtime Realization architecture without layer collapse or authority drift?
```

Required skills:

- architecture;
- system-design;
- target-authority-migration.

Focus:

- topology, ownership, and runtime authority;
- services/plugins/apps/resources/providers/profiles boundaries;
- SDK/runtime/adapter/harness/diagnostic ownership;
- lifecycle ordering and realization artifacts;
- stable foundation versus flexible extension boundaries;
- whether plugin internals and other reserved areas are framed as reserved without undermining the foundation;
- whether rejected drift reappears under new wording.

This reviewer owns architecture blocker identification, but the DRI decides final disposition.

### Transplant Completeness Reviewer

Primary question:

```text
Did the returned specification actually carry forward all required repairs and normalized transplant material?
```

Required skills:

- architecture;
- target-authority-migration;
- information-design for wording fidelity.

Focus:

- Baseline Repair Map coverage;
- Normalized Transplants coverage;
- `WorkflowDispatcher`;
- runtime telemetry and diagnostic vocabulary;
- full realization sequence;
- provider acquire/release and provider coverage checks;
- surface-lane examples;
- shutdown and finalization language;
- ownership-law prose that should be preserved;
- exact code or example material that was supposed to survive.

This reviewer must distinguish missing content from content that was correctly synthesized into different wording.

### Blueprint And No-Magic Reviewer

Primary question:

```text
Can a reader see through the layers from authoring surface to backend implementation mechanics?
```

Required skills:

- system-design;
- solution-design;
- architecture.

Focus:

- whether authoring surfaces are backed by matching internal contracts;
- whether every simplified authoring example has equivalent internal mechanics;
- whether examples include simple and realistic N > 1 forms where needed;
- whether code blocks have file and layer context;
- whether system components include file structure, owner, inputs, outputs, and integration points;
- whether examples-as-gates are concrete enough to prevent implementation drift;
- whether the document assembles components into the final system after explaining them.

### Migration-Derivability Reviewer

Primary question:

```text
Can the migration plan be deduced from this specification without reopening architecture?
```

Required skills:

- architecture;
- target-authority-migration;
- solution-design.

Focus:

- whether implementation slices can be derived from the spec;
- whether component ownership maps to plausible migration work;
- whether missing internals block migration planning;
- whether reserved boundaries have integration hooks and latest acceptable lock points;
- whether open questions are real design questions or accidental omissions;
- whether any migration notes belong outside the canonical spec.

This reviewer should not write the migration plan. They evaluate whether the spec can support one.

## Common Agent Contract

Each reviewer receives:

- the returned specification;
- the final cloud-Pro task prompt;
- the five source inputs in `final-cloud-pro-inputs/`;
- extraction artifacts;
- this workflow document;
- a dedicated scratchpad path;
- a dedicated report path.

Each reviewer must:

1. Read the full returned specification before finalizing findings.
2. Read the review-relevant parts of the final cloud-Pro packet.
3. Keep a scratchpad with state transitions, evidence, section anchors, rejected concerns, and final judgment.
4. Produce a concrete report with exact anchors and phrasing.
5. Classify each finding as blocker, required repair, optional improvement, or confirmed-good carry-forward.
6. Avoid re-litigating baseline selection, cloud-input curation, or the runtime architecture unless the returned spec exposes a genuine contradiction with the authority documents.

Reports that lack section anchors, exact wording, or a clear verdict are incomplete and must be returned for repair.

## Reviewer Report Contract

Each report uses this structure:

```text
# <Reviewer Name> Report

Status: Complete | Needs repair
Inputs Read:
- ...

Verdict:
- Ready
- Ready after bounded edits
- Not ready

Confirmed Good:
- ...

Findings:
| Severity | Section Anchor | Finding | Why It Matters | Proposed Repair |
| --- | --- | --- | --- | --- |

Migration / Non-Normative Leakage:
| Section Anchor | Current Language | Issue | Move / Remove / Reframe |
| --- | --- | --- | --- |

Open Questions:
- Only real design questions, not gaps the reviewer can resolve from the documents.
```

## Review State Machine

### `workspace-ready`

- Repository state has been checked.
- Prior agents are closed or ignored.
- Active workflow is known.

### `packet-frozen`

- Returned spec path and hash are recorded.
- Reference packet paths are recorded.
- Exclusions are recorded.

### `extraction-complete`

- Required extraction artifacts exist.
- Extraction is marked non-authoritative evidence.

### `reviewers-launched`

- Fresh reviewers have received complete prompts.
- Each reviewer has scratchpad and report paths.

### `reports-complete`

- Every reviewer report satisfies the report contract.
- Shallow or incomplete reports have been repaired.

### `dri-verified`

- DRI has independently checked all blockers and major repairs.
- Conflicts between reviewers are resolved explicitly.

### `final-verdict-issued`

- Final readiness verdict is issued.
- If needed, a standalone repair report exists.
- Repository is clean or contains only intentional tracked review artifacts.

## DRI Integration Output

The DRI produces one final tracked report after review:

```text
docs/projects/rawr-final-architecture-migration/.context/M2-runtime-realization-lock-spike/runtime-realization-final-spec-readiness-report.md
```

If the specification needs changes, the report includes a dedicated repair section:

```text
## Required Repairs Before Migration Planning
```

Each required repair must include:

- section anchor;
- current problematic language or missing content;
- issue type;
- reason it affects canonical/spec fitness;
- proposed replacement, reframe, move, or deletion;
- whether the repair is local editing or requires another synthesis pass.

## Verdict Options

The final report must choose exactly one:

1. `ready-to-plan`
   - The specification is ready to use as the baseline for deriving the migration plan.

2. `ready-after-bounded-local-edits`
   - The specification is fundamentally sound, but specific local edits are required before migration planning.

3. `not-ready-architecture-blocker`
   - The specification contains architecture or authority defects that prevent safe migration planning.

4. `not-ready-information-design-blocker`
   - The specification may have correct intent, but its structure or language is too ambiguous to serve as canonical authority.

5. `bounded-resynthesis-required`
   - The required changes are larger than local edits but still bounded to identified sections.

A broad cloud resynthesis is not a default outcome. It is recommended only if the returned specification fails the objective in a way that cannot be repaired locally or with bounded section replacement.

## Specific Review Gates

The review is complete only when:

- every reviewer read the full returned specification;
- every reviewer produced a usable scratchpad and report;
- migration notes and non-normative sections have been explicitly accepted, removed, moved, or reframed;
- passive language in load-bearing rules has been reviewed and either accepted or converted to active normative language;
- transplant completeness has been checked against the Baseline Repair Map and Normalized Transplants;
- no rejected drift is accepted silently;
- the DRI has independently verified all blockers;
- the final verdict states whether migration planning can begin.

## Initial Agent Prompt Template

Use this template and specialize the reviewer role section.

```text
You are part of a fresh review team evaluating a returned final Runtime Realization System specification.

Objective:
Determine whether the returned specification is ready to become the baseline for deriving the M2 migration plan. This is a readiness review, not a rewrite, not a new synthesis run, and not a vote.

You must read the full returned specification before finalizing your report. You must also read the review-relevant final cloud-Pro inputs: task prompt, Finalization Authority, Runtime Realization Architecture Authority, Baseline Specification, Baseline Repair Map, and Normalized Transplants.

Authority:
- The returned specification is the candidate under review.
- The final cloud-Pro packet defines what the returned specification was supposed to accomplish.
- Prior agents, old reports, old specs, repo zip contents, and current implementation reality are not authority.

Required posture:
- Preserve hard architectural lines.
- Flag drift from wording, not only obvious structural errors.
- Distinguish canonical normative content from migration notes, process notes, provenance, or non-normative commentary.
- Prefer exact section anchors and replacement language over general criticism.

Scratchpad:
Keep a scratchpad with state transitions, sections read, evidence, rejected concerns, and final judgment.

Report:
Use the required report contract. Classify each finding as blocker, required repair, optional improvement, or confirmed-good carry-forward.
```

## Final Acceptance Standard

The specification is ready only if it can serve as a stable canonical blueprint:

- the foundation is locked and does not require renegotiation during migration planning;
- future-flexible areas are reserved without weakening the foundation;
- authoring surfaces are simple without hiding implementation mechanics;
- each major component has clear ownership, contracts, lifecycle position, examples, and integration points;
- language is active, normative, and unambiguous where the architecture is load-bearing;
- non-canonical migration notes are absent from the spec or explicitly reframed as canonical rules;
- a migration team can deduce implementation slices from the document without inventing missing architecture.
