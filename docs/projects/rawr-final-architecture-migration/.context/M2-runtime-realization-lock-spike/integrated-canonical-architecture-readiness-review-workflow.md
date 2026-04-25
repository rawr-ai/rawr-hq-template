# Integrated Canonical Architecture Comparative Review Workflow

Status: Active workflow draft
Scope: Comparative evaluation of two returned Integrated Canonical Architecture candidates before migration-plan derivation

## Purpose

This workflow determines which returned Integrated Canonical Architecture candidate should become the whole-system architecture baseline for migration planning after the Runtime Realization System specification has been finalized.

The expected candidates are:

- **Version A:** generated from the curated integrated-architecture alignment inputs.
- **Version B:** generated with optional repository-zip grounding and higher-level RAWR geometric design philosophy.

The review is not another cloud synthesis run, not a broad rewrite pass, and not a migration plan. It is a staged comparative review that chooses one baseline, identifies bounded repairs, and decides whether any material from the non-selected candidate should be transplanted.

Success means the final verdict can answer three questions directly:

```text
Which candidate becomes the Integrated Canonical Architecture baseline?
What, if anything, should be transplanted from the non-selected candidate?
Can migration planning begin after those bounded repairs/transplants?
```

The review must not average the two candidates into a third document unless both fail adoption gates and the DRI explicitly chooses a bounded synthesis outcome. Better prose is not enough to win if it weakens authority hygiene. Better authority hygiene is not enough to win if it fails the whole-system architecture role.

## Authority Model

The returned candidates are review subjects. Neither candidate is accepted as restored canonical architecture authority until this workflow reaches a ready verdict.

The review uses the integrated-architecture alignment packet as evidence for what the cloud pass was supposed to accomplish:

```text
docs/projects/rawr-final-architecture-migration/.context/M2-runtime-realization-lock-spike/integrated-architecture-alignment-cloud-pro-inputs/
  00-cloud-pro-task-prompt.md
  01-integrated-architecture-alignment-authority.md
  02-runtime-realization-system-specification.md
  03-integrated-canonical-architecture-document-under-revision.md
```

Authority order during review:

1. Original objective: restore the Integrated Canonical Architecture document as the plug-and-play whole-system architecture authority.
2. `01-integrated-architecture-alignment-authority.md`.
3. `02-runtime-realization-system-specification.md`, for anything it overlaps.
4. `03-integrated-canonical-architecture-document-under-revision.md`, as evidence of prior broad architecture content and stale carry-over risk.
5. Version A and Version B as candidates to accept, repair, mine, or reject.

The repository zip and high-level design philosophy that influenced Version B are not direct review authority unless their substance appears in the candidate and survives the gates above. Current implementation reality must not override finalized architecture. The current repo can be used only to access curated reference inputs and to store review artifacts.

The review must not use prior agents, raw reports, old runtime alternates, repo zips, chat transcripts, scratchpads, or migration docs as authority.

## Staged Workflow

Each stage closes its loop before the next stage begins. The DRI may send a reviewer or artifact back for repair if it does not satisfy the stage contract.

### Stage 0: Workspace And Packet Freeze

**Purpose:** Establish stable inputs, names, hashes, exclusions, and scratch paths before analysis begins.

**DRI actions:**

- Check Git and Graphite status.
- Label the candidates:
  - Version A: curated-input candidate.
  - Version B: repo/philosophy candidate.
- Record each candidate's path, line count, byte count, SHA-256 hash, and user-provided source note.
- Record reference packet paths and source-copy hashes where useful.
- Record exclusions: prior agents, raw reports, old alternates, repo zips, current implementation reality, migration docs, and unprovided cloud-project memory.
- Create the scratch workspace:

```text
.context/.scratch/integrated-canonical-architecture-comparison/
  README.md
  orchestrator.scratch.md
  extraction/
  gates/
  agents/
  reports/
  transplants/
```

**Verification:**

- Both candidate files exist and have recorded hashes.
- The reference packet exists and contains the expected four files.
- Git/Graphite state is recorded.
- Scratch workspace is created.

**Loop closure artifact:**

```text
.context/.scratch/integrated-canonical-architecture-comparison/README.md
```

The README freezes the review packet and states the authority order.

### Stage 1: Comparative Extraction And Parsing

**Purpose:** Produce concrete evidence for comparison before semantic review. Extraction is evidence, not a substitute for full reading.

Each extraction artifact must cover both Version A and Version B in the same format.

| Standalone extraction module | Purpose |
| --- | --- |
| `section-index.md` | Establish comparable section anchors for Version A and Version B so reviewers can work section-by-section without drifting into line-by-line editing. |
| `outline-comparison.md` | Compare section structure, ordering, heading quality, and whole-system coverage. |
| `term-entity-inventory.md` | Compare ontology nouns, aliases, package roots, roles, surfaces, runtime nouns, subsystem names, and repeated terms. |
| `runtime-overlap-map.md` | Locate every runtime realization overlap: lifecycle, SDK/runtime ownership, service/plugin/app ownership, resources/providers/profiles, runtime access, schema, async, diagnostics, telemetry, and catalog. |
| `drift-scan.md` | Flag stale roots and nouns such as `packages/runtime/*`, `packages/hq-sdk`, `@rawr/hq-sdk`, `@rawr/runtime`, `startAppRole(...)`, `ProcessView`, `RoleView`, `RuntimeView`, `exposure`, `visibility`, `adapter.kind`, and `packages/agent-runtime/*`. |
| `carried-over-content-map.md` | Identify content retained from the prior Integrated Canonical Architecture document and whether it remains coherent after runtime realignment. |
| `philosophy-coherence-map.md` | Compare foundry philosophy, geometric design language, support matter, semantic capability truth, runtime projection, app composition authority, and scale-continuity claims. |
| `subsystem-boundary-map.md` | Identify where each candidate points to subsystem specs and whether it over-owns runtime, service, plugin, harness, agent, resource/provider/profile, telemetry, catalog, or workflow internals. |
| `normative-language-scan.md` | Flag migration notes, process commentary, passive ownership language, speculative future language, TODOs, provenance, source-document scaffolding, and input-document references. |
| `example-diagram-inventory.md` | Compare diagrams, examples, code blocks, tables, and whether they help architecture without becoming subsystem contracts. |
| `migration-derivability-map.md` | Identify whether downstream migration domains can be derived without reopening architecture or inventing missing integration boundaries. |
| `comparison-matrix.md` | Summarize the above modules into a side-by-side scorecard with evidence anchors. |

**Verification:**

- Every module covers both candidates.
- Every module distinguishes extraction facts from interpretation.
- Every flagged issue has a section anchor or search evidence.
- `section-index.md` gives stable anchors that every reviewer can reuse.
- `comparison-matrix.md` links back to the standalone modules.

**Loop closure artifact:**

```text
.context/.scratch/integrated-canonical-architecture-comparison/extraction/comparison-matrix.md
```

The DRI reviews the extraction bundle and records whether semantic review can begin.

### Stage 2: Hard-Gate Review

**Purpose:** Eliminate candidates that cannot safely become the baseline before spending time on nuanced comparison.

Run the same hard gates against both candidates.

| Gate | Failure condition |
| --- | --- |
| Runtime overlap authority | Candidate contradicts the finalized Runtime Realization System specification at load-bearing integration points. |
| Canonical architecture role | Candidate does not function as the plug-and-play whole-system architecture document. |
| Stale carry-over | Candidate preserves prior architecture material that remains semantically stale after runtime realignment. |
| Repo leakage | Candidate turns current repo implementation, zip-specific topology, or local examples into architecture authority. |
| Philosophy drift | Candidate uses broad design philosophy to override runtime locks or blur ownership boundaries. |
| Runtime over-duplication | Candidate copies subsystem blueprint details wholesale instead of summarizing integration points. |
| Normative fitness | Candidate includes migration notes, process commentary, provenance, or non-normative scaffolding as canonical content. |
| Migration usability | Candidate cannot support migration planning without inventing missing architecture. |

**Verification:**

- Each gate is marked `pass`, `pass-with-repair`, or `fail` for each candidate.
- Every `fail` or `pass-with-repair` includes evidence anchors.
- The DRI verifies any hard failure directly before accepting it.

**Loop closure artifact:**

```text
.context/.scratch/integrated-canonical-architecture-comparison/gates/hard-gate-report.md
```

If exactly one candidate passes the hard gates, it becomes the presumptive baseline and review continues to transplant mining and bounded repair. If both pass, continue to full specialist review. If neither passes, the DRI decides between bounded local repair, bounded resynthesis, or stopping.

### Stage 3: Specialist Comparative Review

**Purpose:** Compare the viable candidates across explicit layers that determine baseline fitness.

Use a fresh team. Close or ignore prior agents and do not reuse prior agent conclusions as review authority. Use default or higher-capability agents only. Do not use explorer agents.

Use six layer owners. Each layer owner compares both entire documents section-by-section through only that owned layer. The comparison is section-by-section, not line-by-line. The goal is to identify which candidate better serves the final canonical architecture document and what concrete material, if any, should be transplanted.

The team uses independent layer review plus one DRI integration decision. Agents advise; the DRI owns the final verdict.

Every layer report must be organized by section. It may summarize sections that have no finding, but it must show that the reviewer considered the whole document.

The comparison layers are:

| Layer | Owner | Primary question |
| --- | --- | --- |
| 1 | Architecture Coherence And Philosophy | Which document better hangs together as the whole-system RAWR architecture? |
| 2 | Runtime Authority And Ownership Boundaries | Which document aligns runtime overlap and subsystem authority without duplicating runtime internals? |
| 3 | Information Design And Canonical Language | Which document explains and phrases the architecture more clearly, normatively, and durably? |
| 4 | Prior Carry-Forward And Stale Content | Which document keeps the right prior material and removes or repairs stale carry-over? |
| 5 | Visuals, Illustrations, Examples, And Tables | Which document uses diagrams, examples, tables, and explanatory artifacts better, and what should be transplanted? |
| 6 | Migration Derivability And Finalization Fitness | Which document can more safely become the baseline for the next migration-plan pass? |

#### DRI / Orchestrator

Owner: main-thread lead agent.

Responsibilities:

- freeze the packet;
- create and maintain the scratch workspace;
- run extraction;
- launch reviewers with full context and bounded prompts;
- reject shallow reports and send them back for repair;
- independently verify blockers and high-risk claims;
- consolidate findings without averaging away hard lines;
- decide the baseline;
- produce the transplant ledger and final evaluation;
- produce the final specification modification packet;
- keep the repository clean.

The DRI maintains:

```text
.context/.scratch/integrated-canonical-architecture-comparison/orchestrator.scratch.md
```

#### Layer 1: Architecture Coherence And Philosophy Reviewer

Primary question:

```text
Which candidate better hangs together as the whole-system RAWR architecture?
```

Required skills:

- system-design;
- solution-design;
- architecture.

Focus:

- whole-system boundary and overview role;
- RAWR as bounded software foundry;
- geometric design philosophy where it strengthens the canonical architecture;
- support matter versus semantic capability truth versus runtime projection versus app-level composition authority;
- layer breakdown, realization chain, roles, surfaces, apps, services, plugins, resources, and platform placement;
- whether broad architecture content retained from the prior document still coheres with the new runtime realization model;
- whether the candidate collapses into runtime-only architecture or preserves broader platform philosophy.

#### Layer 2: Runtime Authority And Ownership Boundaries Reviewer

Primary question:

```text
Which candidate better matches the finalized Runtime Realization System specification at every overlap point without duplicating the subsystem blueprint?
```

Required skills:

- architecture;
- system-design;
- target-authority-migration.

Focus:

- package topology, public SDK naming, start API, lifecycle, runtime access nouns, and ownership laws;
- service authoring/dependency lanes, plugin projection classification, app/manifest vocabulary, resources/providers/profiles, schema, async, agent/OpenShell, desktop, diagnostics, telemetry, and catalog;
- runtime realization summarized at architecture level;
- forbidden runtime drift under new wording;
- repo-zip leakage in topology, package names, implementation examples, current-state claims, or operational assumptions;
- brittle dependencies on the Runtime Realization System specification;
- duplication of implementation details that should live in the Runtime Realization System specification;
- stable entities, terms, and ontology that belong in both documents as integration contracts.

#### Layer 3: Information Design And Canonical Language Reviewer

Primary question:

```text
Which candidate is clearer, more navigable, more normative, and less likely to create wording drift?
```

Required skills:

- information-design;
- target-authority-migration as support for authority separation.

Focus:

- structure, heading scent, and whole-document navigation;
- active versus passive architecture language;
- canonical phrasing consistency;
- explanation quality and reader path;
- over-qualification, hedging, metacommentary, and unnecessary caveats;
- migration notes or process notes embedded in canonical sections;
- non-normative sections that should be removed, moved, or reframed;
- source-document scaffolding or prompt/task language that leaked into output;
- overloaded terms or aliases that could create authority drift.

#### Layer 4: Prior Carry-Forward And Stale-Content Reviewer

Primary question:

```text
Which candidate preserved the right prior architecture content and repaired or removed the wrong carry-over?
```

Required skills:

- information-design;
- target-authority-migration;
- architecture.

Focus:

- sections carried over from `03-integrated-canonical-architecture-document-under-revision.md`;
- prior content that remains valid and should be confirmed-good;
- prior content that is semantically stale even if renamed;
- title, section, and heading carry-over that preserves outdated authority or document identity;
- broad architecture claims whose runtime examples now conflict with the finalized runtime spec.

This reviewer must distinguish valid preservation from accidental survivorship.

#### Layer 5: Visuals, Illustrations, Examples, And Tables Reviewer

Primary question:

```text
Which candidate has better diagrams, illustrations, examples, tables, and explanatory artifacts for the final canonical architecture document?
```

Required skills:

- information-design;
- architecture;
- solution-design.

Focus:

- whether visuals clarify architecture rather than decorate it;
- whether diagrams show whole-system relationships, layers, ownership, and subsystem attachment points;
- whether examples help canonical architecture without becoming runtime subsystem contracts;
- whether tables should be transplanted, removed, simplified, or reframed;
- whether visuals or examples duplicate low-level runtime detail owned by the Runtime Realization System specification;
- whether any diagram or example carries stale repo/current-state topology into target architecture.

#### Layer 6: Migration Derivability And Finalization Fitness Reviewer

Primary question:

```text
Which candidate can more safely become the baseline for migration planning without reopening architecture?
```

Required skills:

- solution-design;
- architecture;
- target-authority-migration.

Focus:

- implementation domains and sequencing can be derived from the integrated document plus the finalized runtime spec;
- architecture ownership maps to plausible migration workstreams;
- non-runtime architecture domains remain clear enough to plan around;
- missing integration boundaries that block migration planning;
- remaining questions are real design questions or accidental omissions;
- whether runtime realization remains a separate subsystem blueprint;
- whether service package internals, plugin internals, harness internals, agent/OpenShell governance, resource/provider/profile details, telemetry/catalog persistence, and workflow internals are over-specified;
- whether potential future sub-specification boundaries are preserved without creating migration notes or TODOs;
- whether interface points between integrated architecture and subsystem specs are concrete enough to avoid authority gaps;
- whether any content should be extracted into a standalone sub-spec before migration planning.

This reviewer must not write the migration plan.

**Verification:**

- Each reviewer reads both candidates in full before finalizing.
- Each reviewer compares the whole of both documents section-by-section through their owned layer.
- Each reviewer organizes their report by section, not by isolated search hits.
- Each reviewer uses the same candidate labels and reference packet.
- Each reviewer produces a report with evidence anchors and a baseline recommendation.
- Shallow reports are returned for repair.

**Loop closure artifact:**

```text
.context/.scratch/integrated-canonical-architecture-comparison/reports/
```

All reports must satisfy the report contract before DRI integration begins.

### Stage 4: DRI Comparative Integration

**Purpose:** Convert parallel reports into a single baseline decision without voting, averaging, or losing hard-line authority issues.

**DRI actions:**

- Read every reviewer report.
- Independently inspect every blocker and every proposed transplant.
- Compare Version A and Version B on:
  - authority compliance;
  - whole-system architecture cohesion;
  - information design and normative clarity;
  - prior carry-forward quality;
  - source-leakage risk;
  - subsystem-boundary precision;
  - migration derivability.
- Resolve conflicts explicitly.
- Decide one of:
  - Version A as baseline;
  - Version B as baseline;
  - one candidate as baseline after bounded local edits;
  - neither candidate, bounded section replacement required;
  - neither candidate, bounded resynthesis required.

**Verification:**

- Every major reviewer disagreement is resolved with evidence.
- The selected baseline passes all hard gates or has bounded repairs that do not alter its architecture.
- The non-selected candidate is classified as rejected, transplant source only, or irrelevant.

**Loop closure artifact:**

```text
.context/.scratch/integrated-canonical-architecture-comparison/reports/dri-baseline-decision.md
```

The DRI baseline decision must exist before transplant mining begins.

### Stage 5: Transplant Mining And Normalization

**Purpose:** Mine the non-selected candidate only for concrete material that should improve the selected baseline.

This stage is skipped only if the DRI records that no transplant material is needed.

Transplants are standalone modules, not vague suggestions. Each transplant must be independently usable for repair or recomposition.

Each transplant module uses this shape:

```text
## Transplant <ID>: <Name>

Source Candidate:
Source Anchor:
Destination Baseline Anchor:
Design Element Affected:
Purpose:
Reusable Material:
Normalization Required:
Forbidden Carry-Over:
Acceptance Criteria:
Repair Type: wording | section structure | diagram | table | example | concept framing | boundary rule
```

Expected transplant categories include, but are not limited to:

- whole-system philosophy or geometric framing that improves cohesion;
- clearer layer model or realization-chain prose;
- better section organization or heading structure;
- stronger integration-point phrasing;
- better subsystem-boundary language;
- better migration-derivability framing;
- diagrams or tables that explain architecture without becoming subsystem contracts.

**Verification:**

- Every proposed transplant has exact source and destination anchors.
- Every transplant states what to keep and what to exclude.
- Transplants from Version B are checked for repo-zip leakage and philosophy-overreach.
- Transplants from Version A are checked for excessive narrowness or missing whole-system context.
- No transplant imports stale runtime topology, stale SDK names, stale app start APIs, old access nouns, or non-normative migration notes.

**Loop closure artifacts:**

```text
.context/.scratch/integrated-canonical-architecture-comparison/transplants/transplant-ledger.md
.context/.scratch/integrated-canonical-architecture-comparison/transplants/transplant-modules/
```

The DRI reviews and accepts or rejects each transplant module before the final evaluation is written.

### Stage 6: Baseline Repair And Keep/Replace Map

**Purpose:** Translate the baseline decision and accepted transplants into a concrete repair map.

The repair map is not the final edited architecture document. It is the actionable specification of what to keep, repair, replace, or transplant.

Each repair item must include:

- baseline section anchor;
- current language or missing content;
- action: keep, repair in place, replace, augment, remove, extract;
- source of replacement if any;
- exact transplant module ID if any;
- reason;
- acceptance criteria.

**Verification:**

- Every required repair from hard gates and specialist reports is represented.
- Every accepted transplant appears exactly once.
- Optional improvements are separated from required repairs.
- No rejected material is reintroduced.

**Loop closure artifact:**

```text
.context/.scratch/integrated-canonical-architecture-comparison/reports/baseline-keep-replace-map.md
```

The DRI verifies the map before writing the final evaluation.

### Stage 7: Final Evaluation And Recommendation

**Purpose:** Produce the final tracked decision artifacts: an evaluation and a specification modification packet.

The DRI writes:

```text
docs/projects/rawr-final-architecture-migration/.context/M2-runtime-realization-lock-spike/integrated-canonical-architecture-comparative-evaluation.md
docs/projects/rawr-final-architecture-migration/.context/M2-runtime-realization-lock-spike/integrated-canonical-architecture-final-modification-packet.md
```

The final evaluation must include:

- candidate labels, paths, hashes, and source notes;
- authority and input exclusions;
- hard-gate results;
- comparative matrix;
- final baseline decision;
- required repairs before adoption;
- transplant ledger summary;
- concrete transplant modules or links to accepted modules;
- rejected material and why it must not carry forward;
- canonical phrasing to preserve;
- subsystem-boundary and sub-specification decisions;
- migration-readiness verdict;
- real remaining design questions only.

The final specification modification packet is the actionable change spec for producing the final canonical document. It must be usable independently of the reviewer reports. It includes:

- selected baseline candidate;
- adoption verdict and prerequisite repairs;
- section-by-section keep, repair, replace, augment, remove, or extract instructions;
- accepted transplant modules with exact source anchors, destination anchors, reusable material, normalization rules, and forbidden carry-over;
- visual/table/example transplant instructions;
- canonical phrasing to preserve;
- boundary statements that must remain integration-level rather than subsystem-detail-level;
- sub-specification candidates, if any, with owner and required integration point;
- final acceptance checks for the edited canonical architecture document.

The final recommendation must choose exactly one:

1. `accept-version-a-as-baseline`
2. `accept-version-b-as-baseline`
3. `accept-version-a-after-bounded-edits`
4. `accept-version-b-after-bounded-edits`
5. `accept-neither-bounded-section-replacement-required`
6. `accept-neither-bounded-resynthesis-required`
7. `sub-spec-extraction-required-before-adoption`

**Verification:**

- The final evaluation answers which option becomes baseline.
- It states whether transplant material is needed.
- It states concretely what every transplant looks like.
- The final modification packet is standalone and can drive the bounded editing/recomposition pass.
- Every accepted transplant appears in the final modification packet.
- It distinguishes required repairs from optional improvements.
- It states whether migration planning can begin after the recommended bounded work.
- DRI checks `git diff --check`, `git diff --cached --check`, `git status --short --branch`, and `gt status --short`.

**Loop closure artifact:**

The tracked final evaluation and final modification packet are the review outcome. Scratch artifacts remain internal evidence unless the user asks to promote a specific artifact.

## Layer Reviewer Report Contract

Each report uses this structure:

```text
# <Layer Name> Comparative Report

Status: Complete | Needs repair
Owned Layer:
Inputs Read:
- Version A
- Version B
- Alignment prompt/authority
- Runtime Realization System specification
- Prior Integrated Canonical Architecture document under revision
- Extraction artifacts

Verdict:
- Version A baseline
- Version B baseline
- Version A after bounded edits
- Version B after bounded edits
- Neither ready

Confirmed Good:
| Candidate | Section Anchor | Finding |
| --- | --- | --- |

Findings:
| Severity | Candidate | Section Anchor | Finding | Why It Matters | Proposed Repair |
| --- | --- | --- | --- | --- | --- |

Section-By-Section Comparison:
| Section / Architecture Area | Version A | Version B | Layer Finding | Recommendation |
| --- | --- | --- | --- | --- |

Transplant Candidates:
| Source Candidate | Source Anchor | Destination Concept | Material | Normalization Required |
| --- | --- | --- | --- | --- |

Carried-Over Content:
| Candidate | Section Anchor | Prior Content Retained | Verdict | Reason |
| --- | --- | --- | --- | --- |

Migration / Non-Normative Leakage:
| Candidate | Section Anchor | Current Language | Issue | Move / Remove / Reframe |
| --- | --- | --- | --- | --- |

Sub-Specification Candidates:
| Candidate | Topic | Extract / Keep / Defer | Reason | Required Interface Point |
| --- | --- | --- | --- | --- |

Open Questions:
- Only real design questions, not gaps the reviewer can resolve from the documents.
```

## Review State Machine

### `workspace-ready`

- Repository state has been checked.
- Prior agents are closed or ignored.
- Active workflow is known.

### `packet-frozen`

- Version A and Version B paths and hashes are recorded.
- Reference packet paths are recorded.
- Exclusions are recorded.

### `extraction-complete`

- Required extraction modules exist.
- Extraction is marked non-authoritative evidence.
- `comparison-matrix.md` exists.

### `hard-gates-complete`

- Both candidates have hard-gate results.
- DRI has verified any hard failure.

### `reviewers-launched`

- Fresh reviewers have received complete prompts.
- Each reviewer has scratchpad and report paths.

### `reports-complete`

- Every reviewer report satisfies the report contract.
- Shallow or incomplete reports have been repaired.

### `baseline-selected`

- DRI baseline decision exists.
- Non-selected candidate is classified for transplant mining or rejection.

### `transplants-normalized`

- Accepted transplant modules exist or DRI has recorded that no transplants are needed.

### `repair-map-complete`

- Baseline keep/replace map exists.
- Required repairs and transplants are represented.

### `final-verdict-issued`

- Final comparative evaluation is written.
- Final specification modification packet is written.
- Repository is clean or contains only intentional tracked review artifacts.

## Initial Agent Prompt Template

Use this template and specialize the reviewer role section.

```text
You are part of a fresh comparative review team evaluating two returned Integrated Canonical Architecture candidates.

Objective:
Determine which candidate should become the whole-system architecture baseline for deriving the migration plan, whether the non-selected candidate contains transplant-worthy material, and whether bounded repairs are required. This is a comparative readiness review, not a rewrite, not a new synthesis run, and not a vote.

You must read both candidates in full before finalizing your report. You must also read the review-relevant alignment inputs: task prompt, Integrated Architecture Alignment Authority, finalized Runtime Realization System specification, and the prior Integrated Canonical Architecture document under revision.

You own one comparison layer. Compare the entire two documents section-by-section through that layer. Do not perform a line-by-line edit. Do not review through other layers except where a boundary issue directly affects your layer.

Authority:
- Version A and Version B are candidates under review.
- The alignment packet defines what the returned candidates were supposed to accomplish.
- The finalized Runtime Realization System specification remains authority for anything it overlaps.
- Repository-zip context and high-level philosophy may explain Version B's origin, but they are not review authority unless the candidate expresses them in a way that survives the gates.
- Prior agents, old reports, old specs, repo zip contents, and current implementation reality are not authority.

Required posture:
- Preserve hard architectural lines.
- Do not average candidates.
- Verify that carried-over content still makes coherent sense after runtime realignment.
- Flag drift from wording, not only obvious structural errors.
- Distinguish canonical normative content from migration notes, process notes, provenance, or non-normative commentary.
- Identify concrete transplant material with exact source and destination anchors.
- Organize your report by section or architecture area so the DRI can recombine layer findings into one modification packet.
- Prefer exact section anchors and replacement language over general criticism.

Scratchpad:
Keep a scratchpad with state transitions, sections read, evidence, rejected concerns, transplant candidates, and final judgment.

Report:
Use the required comparative report contract. Classify each finding as blocker, required repair, optional improvement, confirmed-good carry-forward, or extraction/sub-spec candidate.
```

## Final Acceptance Standard

The selected baseline is ready only if it can serve as a stable whole-system canonical architecture frame:

- the Integrated Canonical Architecture document owns the shared vocabulary, durable ontology, layer model, system philosophy, high-level topology, and integration points;
- the Runtime Realization System specification remains the detailed subsystem blueprint and is not duplicated wholesale;
- runtime realization overlap matches the finalized runtime spec at concrete integration points;
- retained broad architecture content still coheres with the new runtime realization model;
- broader philosophy strengthens, rather than weakens, target authority;
- subsystem boundaries are concrete enough to avoid authority gaps;
- future-flexible areas are reserved without weakening the foundation;
- language is active, normative, and unambiguous where the architecture is load-bearing;
- non-canonical migration notes are absent from the spec or explicitly reframed as canonical rules;
- any transplant material is concrete, normalized, and safe to apply;
- a migration team can derive planning domains from the selected baseline without inventing missing architecture.
