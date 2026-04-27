# Runtime Realization Candidate Review Workflow

Status: Prepared workflow
Scope: Comparative evaluation of two returned Runtime Realization System candidate specifications

## Purpose

This workflow selects the best candidate specification to become the baseline for Runtime Realization System migration planning.

The review is not another cloud synthesis run. The review chooses a baseline, identifies bounded repairs, and decides whether either candidate is fit to carry forward. Agents may recommend surgical transplants from the non-selected candidate, but they must not average the two candidates into a third document unless both candidates fail the adoption gates and the DRI explicitly chooses a bounded synthesis or resynthesis outcome.

Success means the final integration report can answer:

- which candidate should become the baseline, or why neither should;
- whether the chosen candidate preserves the load-bearing runtime architecture;
- which defects must be fixed before adoption;
- which exact wording or component material should be preserved;
- whether the document is usable as the basis for migration planning.

## Authority Model

The Synthesis Lock remains architecture authority.

The prompt governs the Pro model synthesis process and document construction standard. During review, it is evidence for expected process and output quality only. It does not become a second architecture authority.

The two candidate specifications are reviewed as proposed canonical specs. They do not become authority until selected and repaired.

The alternates are used to verify carry-forward fidelity. They are not independent authority over the Synthesis Lock.

The Grounding Excerpt is quarantined service-internals realism only. It does not provide server API projection internals, canonical service topology, repo topology, or alternate architecture.

No raw reports, old specs, repo zip contents, old architecture/foundry documents, or review transcripts are part of the review input set unless the user explicitly adds them for a bounded factual question.

## Frozen Input Set

When the candidate specs arrive, freeze the review packet before starting agent work.

Required inputs:

- Candidate A: first returned Runtime Realization System candidate specification.
- Candidate B: second returned Runtime Realization System candidate specification.
- Runtime Realization Synthesis Lock.
- GPT-5.5 Pro Runtime Realization Synthesis Prompt.
- Runtime Realization Implementation Grounding Excerpt.
- Alternative Runtime Realization Specification 1.
- Alternative Runtime Realization Specification 2.

The candidate docs receive stable labels before extraction starts. Labels are mechanical and do not imply preference.

Record for each candidate:

- stable label;
- local file path;
- source timestamp or receipt note;
- byte count;
- line count;
- content hash.

## Output Artifacts

Use one scratch workspace for temporary review state:

```text
.context/.scratch/runtime-realization-candidate-review/
  README.md
  candidates/
    candidate-a.md
    candidate-b.md
  extraction/
    candidate-a-outline.md
    candidate-b-outline.md
    candidate-a-code-blocks.md
    candidate-b-code-blocks.md
    term-entity-inventory.md
    runtime-artifact-inventory.md
    api-import-path-inventory.md
    example-inventory.md
    ownership-boundary-inventory.md
    reserved-boundary-inventory.md
    hard-lock-scan.md
    comparison-matrix.md
  agents/
    information-design.scratch.md
    architecture-lock.scratch.md
    carry-forward.scratch.md
    migration-derivability.scratch.md
  reports/
    information-design.report.md
    architecture-lock.report.md
    carry-forward.report.md
    migration-derivability.report.md
```

Scratch files are working memory, not future authority. Keep them until the final integration report is complete, then decide whether to delete or retain them as internal provenance. If retained, they remain non-authoritative and must not be fed into future synthesis as source material.

The final tracked integration report should live beside the lock and prompt:

```text
docs/projects/rawr-final-architecture-migration/.context/M2-runtime-realization-lock-spike/runtime-realization-candidate-evaluation.md
```

## Team Design

The team uses independent review plus one DRI decision. The team does not vote and does not average recommendations.

Use default or higher-capability agents. Do not use explorer agents for this review.

### DRI / Orchestrator

Owner: lead agent in the main thread.

Responsibilities:

- freeze the input packet;
- produce extraction artifacts;
- create reviewer prompts with full context and bounded authority;
- maintain the review state machine;
- wait for complete reports and send incomplete reports back for correction;
- resolve reviewer conflicts;
- independently verify high-risk findings;
- produce the final integration report;
- keep the repo clean.

The DRI may use a scratchpad when the review starts:

```text
.context/.scratch/runtime-realization-candidate-review/orchestrator.scratch.md
```

The DRI scratchpad tracks status, evidence checked, agent report receipt, conflicts, accepted/rejected recommendations, final verdict reasoning, and remaining open questions.

### Information Design Reviewer

Primary question: Which candidate is clearer, more stable, more internally consistent, and less likely to cause drift through wording?

Focus:

- document structure and navigation;
- canonical phrasing;
- term consistency;
- ambiguity and overloaded language;
- whether the spec is standalone and normative;
- whether prompt/process language leaked into the spec;
- whether detail is placed where readers will need it.

This reviewer may prefer a candidate that is structurally stronger only if it does not violate architecture hard gates.

### Architecture / Lock Reviewer

Primary question: Which candidate best preserves the Synthesis Lock as architecture authority?

Focus:

- topology;
- ownership laws;
- lifecycle ordering;
- services/plugins/apps/resources/providers/SDK/runtime/harness/diagnostics boundaries;
- runtime realization artifact ownership;
- forbidden layer collapse;
- stale topology or import drift;
- hard blockers that disqualify a candidate.

This reviewer owns fatal architecture findings, but the DRI decides final adoption.

### Carry-Forward Reviewer

Primary question: Which candidate carries forward the load-bearing architecture from the alternates without softening it into generic prose?

Focus:

- `RuntimeSchema`;
- schema-backed service and plugin contracts;
- `ServiceBindingCacheKey`;
- `RuntimeAccess`, `ProcessRuntimeAccess`, and `RoleRuntimeAccess`;
- resource/provider/profile contracts;
- bootgraph, provisioning, managed runtime, process runtime, harness stop;
- `RuntimeCatalog`, `FunctionBundle`, and `WorkflowDispatcher`;
- projection lanes;
- simple plus realistic N > 1 examples;
- authoring convenience mirrored by SDK/runtime/harness internals.

This reviewer must name missing carry-forward material precisely, not just state that a candidate is incomplete.

### Migration Derivability Reviewer

Primary question: Can this candidate become the working baseline for migration planning?

Focus:

- whether implementation slices can be derived from the spec;
- whether file/module ownership is clear enough to plan;
- whether examples reveal enough to build gates and migrations;
- whether reserved boundaries expose integration hooks and lock points;
- whether open questions are real design questions or accidental omissions;
- whether the spec supports M2 and later runtime realization work without renegotiating the foundation.

This reviewer evaluates practical usability, not just textual correctness.

## Review State Machine

The workflow uses explicit states so no agent reports before reading enough context.

### Global States

1. `packet-frozen`
   - Candidate A and Candidate B are saved with stable labels.
   - Required inputs are present.
   - Candidate hashes and line counts are recorded.

2. `extraction-complete`
   - Outlines, inventories, and hard-lock scans exist.
   - Extraction artifacts are treated as evidence, not as substitutes for full reading.

3. `reviewers-launched`
   - Each reviewer receives the full input list, extraction artifacts, output contract, scratchpad path, and report path.

4. `reports-complete`
   - Every reviewer report satisfies its output contract.
   - Any incomplete or shallow report has been sent back for repair.

5. `integration-drafted`
   - DRI has read every report, independently checked high-risk claims, and drafted the final evaluation.

6. `integration-verified`
   - Final report contains a verdict, repair ledger, transplant ledger if needed, and migration-readiness decision.
   - Repo checks pass.

7. `closed`
   - Scratch/report retention is decided.
   - Agent sessions are closed.
   - Worktree is clean.

### Per-Agent States

Each reviewer scratchpad must expose this state log:

```text
State:
- initialized
- read-synthesis-lock
- read-prompt
- read-grounding-excerpt
- read-alt-1
- read-alt-2
- read-candidate-a
- read-candidate-b
- read-extraction-artifacts
- analysis-complete
- report-written
```

Agents must not produce a final preference until they have read both candidates in full.

If an agent cannot complete a full read, it must say so in the report. Partial reports are not accepted as final evidence for base selection.

## Extraction And Parsing Pass

Extraction happens before semantic review. Its purpose is to give reviewers concrete comparison material and prevent impressionistic evaluation.

The DRI owns extraction so all reviewers work from the same normalized evidence.

### Candidate Metadata

For each candidate, record:

- stable label;
- file path;
- hash;
- line count;
- heading count;
- code block count;
- labeled code block count;
- unlabeled code block count;
- diagram count;
- package tree count.

### Document Outline Extraction

Extract every heading with level and line number.

The outline comparison should answer:

- Does the candidate expose component-first sections before assembly flows?
- Does it provide both reference navigation and system explanation?
- Does it flatten load-bearing components into generic sections?
- Does it overfit the prompt as a table of contents?
- Does it bury hard laws, examples, or integration contracts?

### Term And Entity Inventory

Build a normalized inventory of important nouns and aliases.

At minimum, scan for:

- `RuntimeSchema`;
- `RuntimeAccess`;
- `ProcessRuntimeAccess`;
- `RoleRuntimeAccess`;
- `ServiceBindingCacheKey`;
- `RuntimeCatalog`;
- `RuntimeDiagnostic`;
- `RuntimeTelemetry`;
- `FunctionBundle`;
- `WorkflowDispatcher`;
- `RuntimeResource`;
- `ResourceRequirement`;
- `ResourceLifetime`;
- `RuntimeProvider`;
- `RuntimeProfile`;
- `ProviderSelection`;
- `PluginDefinition`;
- `PluginFactory`;
- `defineApp`;
- `startApp`;
- `defineService`;
- `resourceDep`;
- `serviceDep`;
- `semanticDep`;
- `useService`;
- `bindService`;
- `Bootgraph`;
- `ProvisionedProcess`;
- `ManagedRuntime`;
- `SurfaceAdapter`;
- `SurfaceRuntimePlan`;
- `CompiledProcessPlan`.

For each term, record:

- candidate presence;
- definition location;
- number of uses;
- aliases or inconsistent naming;
- whether the term is used as semantic, SDK-derived, runtime-internal, or harness-facing.

### Runtime Artifact Inventory

Inventory derived, compiled, provisioned, bound, adapter-lowered, harness-facing, diagnostic, and catalog artifacts.

For each artifact, record:

- owner;
- producer;
- consumer;
- lifecycle phase;
- file/package placement if shown;
- whether inputs and outputs are concrete;
- whether diagnostics are defined;
- whether the artifact is backed by example code or only prose.

### API, Import, And Path Inventory

Extract paths, package names, imports, public API names, and code labels.

Flag:

- stale target topology;
- non-canonical package roots;
- imports that turn repo substrate into target authority;
- helper names that appear canonical without Synthesis Lock support;
- public start APIs other than `defineApp(...)` and `startApp(...)`;
- examples where topology classification is replaced with generic fields.

### Code Block And Example Inventory

For every code block, record:

- line number;
- language;
- preceding `File:` label;
- preceding `Layer:` or owner label;
- exactness label, if present;
- whether the code is authoring, SDK-derived, runtime-internal, adapter-lowered, harness-facing, or diagnostic;
- whether it is simple, realistic, or assembly-level;
- whether it has a paired realistic example when simplified.

The example inventory must specifically check for:

- N > 1 service module shape;
- public server API projection calling a service;
- internal workflow trigger/status projection wrapping a workflow dispatcher;
- sibling service dependency through `serviceDep(...)`;
- app profile and entrypoint split;
- schema-backed service contracts;
- schema-backed plugin API contracts;
- workflow/schedule/consumer payload contracts;
- backend realization chain for authoring convenience.

### Ownership And Boundary Inventory

Extract normative statements for:

- services own truth;
- plugins own projections;
- apps own selection;
- resources own provisionable capability contracts;
- providers own implementation and acquisition;
- SDK derives;
- runtime compiles, provisions, binds, lowers, realizes, observes, and shuts down;
- harnesses mount native payloads;
- diagnostics observe.

Record whether each statement is affirmative, mechanically enforced, example-backed, or only asserted.

### Reserved Boundary Inventory

Extract every reserved, deferred, flexible, or future-expandable area.

For each area, record whether it has:

- owner;
- package location;
- integration hook;
- required inputs;
- required outputs;
- diagnostics;
- enforcement rule;
- condition requiring a dedicated spec pass.

Reserved boundaries without these details are likely defects.

### Hard-Lock Scan

Hard-lock scans do not replace reading. They identify evidence to inspect.

Scan for recurring high-risk drift:

```text
exposure
visibility
adapter.kind
defineProcessResource
defineRoleResource
startAppRole
RuntimeView
ProcessView
RoleView
@rawr/hq-sdk
@rawr/runtime
packages/runtime
root-level core/
root-level runtime/
```

Also scan for generic schema drift:

```text
schema: "string"
type: "string"
input: "string"
output: "string"
payload: "string"
contract: "string"
```

These strings are not automatically wrong. They require inspection when they stand in for schema definitions at data boundaries.

### Suggested Mechanical Extraction Commands

Use mechanical commands to seed the extraction artifacts, then review the output manually.

```text
shasum -a 256 <candidate-a> <candidate-b>
wc -l -c <candidate-a> <candidate-b>
rg -n "^#{1,6} " <candidate-a> > candidate-a-outline.md
rg -n "^#{1,6} " <candidate-b> > candidate-b-outline.md
rg -n "^```|^File:|^Layer:|^Exactness:" <candidate-a> > candidate-a-code-blocks.md
rg -n "^```|^File:|^Layer:|^Exactness:" <candidate-b> > candidate-b-code-blocks.md
rg -n "RuntimeSchema|ServiceBindingCacheKey|RuntimeAccess|ProcessRuntimeAccess|RoleRuntimeAccess|RuntimeCatalog|FunctionBundle|WorkflowDispatcher|ResourceRequirement|PluginFactory" <candidate-a> <candidate-b>
rg -n "exposure|visibility|adapter.kind|defineProcessResource|defineRoleResource|startAppRole|RuntimeView|ProcessView|RoleView|@rawr/hq-sdk|@rawr/runtime|packages/runtime" <candidate-a> <candidate-b>
rg -n "schema: \"string\"|type: \"string\"|input: \"string\"|output: \"string\"|payload: \"string\"|contract: \"string\"" <candidate-a> <candidate-b>
```

If command output is large, summarize it into the extraction artifact instead of preserving raw terminal output. Extraction artifacts should be readable evidence for reviewers, not noisy command logs.

## Review Gates

Reviewers evaluate hard gates first, merits second.

### Fatal Architecture Gates

A candidate is not acceptable as baseline if it materially:

- replaces topology and builder classification with generic projection status fields such as `exposure` or `visibility`;
- collapses service, plugin, app, resource, provider, SDK, runtime, harness, or diagnostics ownership;
- treats existing repo topology or helper names as canonical target authority without Synthesis Lock support;
- removes or softens `RuntimeSchema` where runtime-carried schema facades are needed;
- represents data schemas as plain string labels at service, plugin, resource, provider, profile, diagnostic, or harness payload boundaries;
- omits the runtime realization chain from authoring through SDK derivation, runtime compilation, provisioning, process runtime binding, adapter lowering, harness mounting, observation, and shutdown;
- hides authoring magic behind unexplained internal behavior;
- omits load-bearing runtime artifacts such as service binding, bootgraph/provisioning, process runtime, adapter lowering, harness handoff, catalog/diagnostics, or workflow dispatch;
- makes framework substrates semantic owners;
- introduces public async APIs directly instead of projection wrappers around dispatcher capabilities;
- changes canonical target topology, package roots, or start APIs.

Fatal findings must include exact evidence and the expected canonical correction.

### Comparative Merits

After hard gates, compare candidates on:

- architecture correctness;
- carry-forward fidelity;
- component completeness;
- internal transparency;
- example quality;
- schema and contract concreteness;
- standalone normative quality;
- information design and navigability;
- migration derivability;
- stability versus flexibility;
- drift resistance.

The best candidate is the one most likely to function as the baseline for implementation planning without silent architecture mutation.

## Reviewer Report Contract

Every reviewer report must include:

1. **Recommendation**
   - Candidate A, Candidate B, neither, or bounded repair/synthesis.
   - Confidence level.
   - One-paragraph rationale.

2. **Hard Blockers**
   - Exact finding.
   - Candidate affected.
   - Evidence pointer.
   - Why it violates the Synthesis Lock or review gate.
   - Required correction.

3. **Repairable Defects**
   - Exact finding.
   - Candidate affected.
   - Evidence pointer.
   - Suggested repair.

4. **Drift-Prone Wording**
   - Exact phrase or paraphrase.
   - Why it can drift.
   - Canonical replacement wording.

5. **Carry-Forward Wins**
   - Material that should be preserved exactly or nearly exactly.
   - Candidate source.
   - Why it is load-bearing.

6. **Transplant Candidates**
   - Material from the non-preferred candidate that should be moved into the preferred candidate.
   - Exact scope.
   - Whether transplant is wording, example, section structure, diagram, or component detail.

7. **Open Questions**
   - Only real design questions.
   - Distinguish real open questions from missing details the candidate should already answer.

8. **Final Verdict**
   - A concise adoption decision from that reviewer.

Reports that only state impressions, summarize the documents, or repeat the prompt without evidence are incomplete.

## Agent Prompt Templates

Use the templates below when launching agents. Fill in concrete file paths after the candidates arrive.

### Shared Preamble For Every Reviewer

```text
You are part of a bounded Runtime Realization candidate-spec review team.

Objective:
Evaluate Candidate A and Candidate B to decide which should become the baseline Runtime Realization System specification for migration planning, or whether neither candidate is acceptable.

You are not writing a new spec. You are not synthesizing the candidates. You are producing a review report with evidence.

Architecture authority:
The Runtime Realization Synthesis Lock is the sole architecture authority. The prompt is process and quality guidance, not architecture authority. The alternates are carry-forward verification sources only. The Grounding Excerpt is quarantined service-internals realism only.

Inputs to read in full:
1. Runtime Realization Synthesis Lock: <path>
2. Runtime Realization Synthesis Prompt: <path>
3. Runtime Realization Implementation Grounding Excerpt: <path>
4. Alternative Runtime Realization Specification 1: <path>
5. Alternative Runtime Realization Specification 2: <path>
6. Candidate A: <path>
7. Candidate B: <path>
8. Extraction artifacts directory: <path>

Required workflow:
1. Create and maintain your scratchpad at <scratchpad-path>.
2. Read the Synthesis Lock first.
3. Read the prompt as process/review guidance only.
4. Read the Grounding Excerpt with quarantine boundaries.
5. Read Alt-1 in full.
6. Read Alt-2 in full.
7. Read Candidate A in full.
8. Read Candidate B in full.
9. Read extraction artifacts as evidence, not as a substitute for full reading.
10. Analyze independently.
11. Write your report at <report-path>.

State hygiene:
Your scratchpad must include a state log with these states:
initialized, read-synthesis-lock, read-prompt, read-grounding-excerpt, read-alt-1, read-alt-2, read-candidate-a, read-candidate-b, read-extraction-artifacts, analysis-complete, report-written.

Do not provide a final candidate preference until you have read both candidates in full.

Output:
Use the reviewer report contract from the workflow. Include exact evidence pointers and proposed canonical wording where wording can drift.
```

### Information Design Reviewer Prompt Addendum

```text
Specialist role:
You are the Information Design Reviewer.

Use information-design discipline. Evaluate whether each candidate is clear, standalone, navigable, normative, and semantically consistent without becoming softer or less precise.

Focus especially on:
- whether the same concept is called the same thing throughout;
- whether headings have strong information scent;
- whether load-bearing rules are placed where readers need them;
- whether the spec has prompt leakage, meta-commentary, temporal/provenance language, or dual-authority phrasing;
- whether examples, diagrams, component tables, and assembly flows are findable and structurally useful;
- whether simplification has removed necessary layer detail;
- whether the chosen document structure helps implementation teams derive work.

Do not prefer polish over architecture. If the clearer candidate violates hard architecture gates, say so.
```

### Architecture / Lock Reviewer Prompt Addendum

```text
Specialist role:
You are the Architecture / Lock Reviewer.

Use architecture and target-authority-migration discipline. Evaluate whether each candidate preserves the Synthesis Lock as the architecture authority.

Focus especially on:
- canonical topology;
- package roots and import posture;
- ownership laws;
- lifecycle ordering;
- SDK derivation versus runtime compilation/provisioning/binding/lowering;
- harness-native boundaries;
- resource/provider/profile separation;
- projection lane classification by topology and builder;
- no generic exposure/classification fields replacing topology;
- no service/plugin/app/resource ownership collapse;
- no stale repo topology turned into target authority;
- no public start APIs beyond canonical start APIs;
- no framework substrate promoted into semantic ownership.

Hard-gate architecture violations must be marked as fatal unless you can show they are localized wording defects with a clear correction.
```

### Carry-Forward Reviewer Prompt Addendum

```text
Specialist role:
You are the Carry-Forward Reviewer.

Evaluate whether each candidate preserves load-bearing runtime architecture from Alt-1 and Alt-2 after translation into Synthesis Lock nouns and topology.

Focus especially on:
- RuntimeSchema minimum facade contract and runtime-carried schema lanes;
- service-owned schema-backed callable contracts;
- plugin API/workflow/schema-backed contracts;
- ServiceBindingCacheKey excluding invocation;
- resource/provider/profile contracts and provider coverage checks;
- RuntimeAccess, ProcessRuntimeAccess, RoleRuntimeAccess;
- bootgraph, provisioning kernel, ManagedRuntime, ProvisionedProcess, rollback/finalizers;
- process runtime ownership and service binding;
- FunctionBundle as harness-facing derived/lowered async artifact;
- WorkflowDispatcher and public/internal projection wrappers;
- RuntimeCatalog, diagnostics, telemetry, topology records, redaction;
- projection lanes for server API/internal, async workflow/schedule/consumer, CLI, web, agent, desktop;
- examples at both simple and realistic N > 1 scale.

Name missing carry-forward material precisely. Do not turn omissions into generic "needs more detail" findings.
```

### Migration Derivability Reviewer Prompt Addendum

```text
Specialist role:
You are the Migration Derivability Reviewer.

Use system-design, architecture, and target-authority-migration discipline. Evaluate whether each candidate can drive migration planning from target authority into implementation slices.

Focus especially on:
- whether implementation teams can derive package/file ownership;
- whether the spec exposes enough component contracts to plan work;
- whether reserved boundaries have owner, integration hook, inputs, outputs, diagnostics, enforcement, and lock point;
- whether examples can become acceptance tests or migration gates;
- whether the document identifies stable foundation versus flexible extension areas;
- whether missing details are acceptable reserved boundaries or accidental omissions;
- whether the candidate supports the next M2 runtime realization work without requiring architecture renegotiation.

Your report should include a migration-readiness verdict for each candidate.
```

## DRI Integration Process

After all reports are complete:

1. Read every reviewer report in full.
2. Build a consolidated finding table.
3. Separate fatal blockers from repairable defects.
4. Identify findings with reviewer disagreement.
5. Independently inspect every fatal blocker and every proposed transplant.
6. Decide the baseline candidate.
7. Create the repair ledger.
8. Create the transplant ledger if material from the non-selected candidate should be carried forward.
9. Create the open-question ledger, limited to real design questions.
10. Write the final integration report.

The DRI must not treat reviewer majority as the answer. The DRI owns the decision.

If reviewer findings conflict:

- architecture hard gates win over polish;
- Synthesis Lock wins over prompt wording;
- concrete examples and component contracts win over summary prose;
- exact evidence wins over reviewer intuition;
- repairability matters only after architecture viability is established.

## Final Integration Report Structure

The final report should use this structure unless the evidence requires a clearer one:

```text
# Runtime Realization Candidate Evaluation

Status:
Review packet:
Verdict:

## Executive Decision

## Candidate Metadata

## Hard Gate Results

## Comparative Evaluation Matrix

## Selected Baseline

## Required Repairs Before Adoption

## Transplant Ledger

## Canonical Phrasing To Preserve

## Missing Or Weakened Architecture

## Migration-Readiness Assessment

## Remaining Open Design Questions

## Reviewer Report Summary

## Verification
```

The report must distinguish:

- adoption blockers;
- required pre-adoption repairs;
- recommended quality improvements;
- optional future enhancements;
- real design questions.

## Decision Outcomes

Use one of these final verdicts.

### Accept Candidate A As Baseline

Use when Candidate A passes hard gates and its defects are repairable without changing the document's architecture.

The report must include:

- required Candidate A repairs;
- any Candidate B transplant material;
- reasons Candidate B is not the baseline.

### Accept Candidate B As Baseline

Use when Candidate B passes hard gates and its defects are repairable without changing the document's architecture.

The report must include:

- required Candidate B repairs;
- any Candidate A transplant material;
- reasons Candidate A is not the baseline.

### Accept Neither, But Repair One Candidate

Use when neither candidate is adoption-ready, but one candidate has the correct foundation and can be repaired locally without another cloud synthesis run.

The report must include:

- selected repair base;
- exact fatal blockers to fix;
- why repair is bounded;
- why another synthesis run is unnecessary.

### Bounded Local Synthesis Required

Use when both candidates contain essential correct material but neither can be adopted or repaired by local edits alone.

The report must include:

- why base selection fails;
- which sections must be synthesized;
- what remains locked;
- why this can be done locally.

### Full Cloud Resynthesis Required

Use only when both candidates fail foundationally and no bounded repair path can preserve the architecture safely.

The report must include:

- exact foundation failures;
- why local repair is unsafe;
- what must change in the prompt or inputs before another cloud run.

This outcome should be rare.

## Verification Checklist

Before final handoff:

- `git status --short --branch`
- `gt status --short`
- candidate hashes recorded
- extraction artifacts created
- all reviewer scratchpads include state logs
- all reviewer reports satisfy the report contract
- final report contains a verdict and repair/adoption plan
- `git diff --check`
- `git status --short --branch`
- `gt status --short`

Run `bun run sync:check` only if tracked docs inventories or generated doc indexes require it.

Close all subagents after their reports are integrated.

## Operating Constraints

- Be patient with agents. Give them time to read the full documents.
- Send back shallow or incomplete reports rather than integrating them.
- Do not ask agents to write a replacement spec.
- Do not average the candidates.
- Do not soften hard lines for readability.
- Do not let the prompt become architecture authority.
- Do not let extraction artifacts replace full-document reading.
- Do not use old specs or repo state as authority.
- Do not treat smooth prose as correctness.
- Do not treat missing examples as minor if they hide layer collapse.
- Do not treat reserved detail boundaries as acceptable unless they expose owner, hook, inputs, outputs, diagnostics, enforcement, and lock point.

## Skills

The DRI should use:

- `team-design` for reviewer roles, relationships, accountability, and state flow;
- `information-design` for document structure, phrase stability, and review artifact clarity;
- `system-design` for relationship-level evaluation and downstream effects;
- `architecture` for target-state and migration-baseline evaluation;
- `target-authority-migration` for authority separation, preserve/mine/delete logic, and no-split-difference decisions.

Review agents should load the skills named in their prompt addendum before analysis.
