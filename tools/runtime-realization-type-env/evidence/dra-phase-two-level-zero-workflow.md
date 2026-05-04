# Phase Two Level Zero DRA Workflow

Status: active DRA-over-program workflow.
Scope: Phase Two runtime-realization program workstream only.

This document is my persistent checkpoint and re-orientation workflow for the
whole Phase Two program. I use it before launching the program, after
compaction, before opening or closing child workstreams, after failed gates,
after parent-review invalidation, and before proof promotion.

It is not runtime architecture authority, not proof authority, not a workstream
report, and not a substitute for the Phase Two program workstream document. It
is the operating anchor that helps me keep the program coherent across
compaction and long-running nested work.

## Purpose And Use

I use this workflow to answer four questions whenever context is thin:

1. Where am I in the level map?
2. What document or workstream am I executing from?
3. What authority, gates, and stop conditions control the next move?
4. What needs cleanup before I continue?

This is a working document, but not a dumping ground. I update it only at phase
boundaries, after compaction recovery, or when the DRA operating workflow itself
changes. Detailed findings belong in workstream reports, the proof manifest,
the runtime-spine diagnostic, the focus log, spec patch proposals, decision
packets, or explicit archive/provenance notes.

If I am tempted to paste a long investigation summary here, I should instead
create or update the correct workstream report and keep this workflow pointed at
the current checkpoint.

## Level Map

| Level | Meaning | Recovery question |
| --- | --- | --- |
| 0 | This DRA-over-program workflow. | Am I re-orienting myself or preparing the operating surface? |
| 1 | The closed composition workstream that produced the Phase Two program workstream document. | Am I only maintaining the coordination artifact, or has the program opened? |
| 2 | The Phase Two program workstream: the all-encompassing production-critical contained proof container. | Which child workstream is next and what is the program-level stop rule? |
| 3 | A child workstream inside Phase Two. | Has this child opened with a template-backed packet and recursive plan? |
| 4 | Phase-local implementation, verification, and review loops inside the active child workstream. | Which focused claim, gate, and review loop am I executing now? |

After compaction I must explicitly state the current level before doing work.
If I cannot state it, I stop and rerun the recovery gate below.

## Compaction Recovery Gate

After compaction, interruption, handoff, or context bleed, I start with
non-mutating grounding:

```bash
git status --short --branch
git branch --show-current
gt status --short
gt ls
bunx nx show project runtime-realization-type-env --json
spec_path=$(jq -r '.spec.path' tools/runtime-realization-type-env/evidence/proof-manifest.json)
actual=$(shasum -a 256 "$spec_path" | awk '{print $1}')
expected=$(jq -r '.spec.sha256' tools/runtime-realization-type-env/evidence/proof-manifest.json)
printf 'actual=%s\nexpected=%s\npath=%s\n' "$actual" "$expected" "$spec_path"
test "$actual" = "$expected"
```

Then I reread the minimum active anchor set:

1. `tools/runtime-realization-type-env/evidence/dra-phase-two-level-zero-workflow.md`
2. `tools/runtime-realization-type-env/evidence/workstreams/2026-04-30-phase-two-production-readiness-program-workstream.md`
3. `tools/runtime-realization-type-env/RUNBOOK.md`
4. `tools/runtime-realization-type-env/AGENTS.md`
5. `tools/runtime-realization-type-env/evidence/design-guardrails.md`
6. `tools/runtime-realization-type-env/evidence/phased-agent-verification-workflow.md`
7. `tools/runtime-realization-type-env/evidence/workstreams/README.md`
8. `tools/runtime-realization-type-env/evidence/workstreams/TEMPLATE.md`
9. `tools/runtime-realization-type-env/evidence/proof-manifest.json`
10. `tools/runtime-realization-type-env/evidence/runtime-spine-verification-diagnostic.md`
11. `tools/runtime-realization-type-env/evidence/spine-audit-map.md`
12. `tools/runtime-realization-type-env/evidence/focus-log.md`
13. The active or latest relevant workstream report under
    `tools/runtime-realization-type-env/evidence/workstreams/`

Before continuing I state:

- current level;
- current branch and Graphite stack position;
- active workstream or "program not opened yet";
- last accepted artifact;
- next required gate;
- current stop/escalation conditions;
- whether workspace cleanup is needed before the next workstream.

## Workspace Preparation Before Program Launch

Before launching the Phase Two program workstream, I open a Level Zero
workspace-preparation pass. That pass is about cleaning the operating surface
so Phase Two starts from a clear lab container.

Completed checkpoint:

- The prelaunch workspace-preparation pass closed in
  `workstreams/2026-04-30-phase-two-prelaunch-workspace-preparation.md`.
- Stale prior-phase work plans were moved under
  `_archive/pre-phase-two-2026-04-30/`.
- Do not rerun this pass before Phase Two unless a new compaction/recovery check
  finds fresh context bleed or stale active inputs.

I inspect:

- the lab container under `tools/runtime-realization-type-env/**`;
- existing workflow docs and runbooks;
- prior workstream reports;
- older work plans in `evidence/**`;
- provenance and cautionary materials, especially runtime-prod lessons;
- stale source-mining outputs or documents that can blend into Phase Two.

I classify each relevant item as one of:

- active runtime/proof authority;
- active coordination input;
- completed continuity;
- cautionary provenance;
- stale prior-phase material;
- archive candidate.

Cleanup means targeted reorganization, archiving, moving aside, or header
clarification. It does not mean broad rewriting or architecture redesign.
Default archive location for lab evidence cleanup:

```text
tools/runtime-realization-type-env/evidence/_archive/
```

Use dated or reason-specific subfolders when that helps future readers avoid
confusion. Do not delete or move authority files silently. Do not bury a
deferred item only in an archive; it still needs an authority home.

Use a team for cleanup review when the inventory is non-trivial:

- Explorer agents inventory files, stale references, mechanical links, and
  candidate duplicates. I do not trust their conclusions.
- Default or strategy agents review authority, cleanup disposition, evidence
  hygiene, and whether an item should remain active, be archived, or become a
  decision packet.
- Agents report internally to the host/DRA only, not to the user. I synthesize
  the result and make the final cleanup call.

Workspace preparation closes only when repo/Graphite state is clean or a named
cleanup blocker is recorded, and when the next action is either "open Phase Two
program workstream" or "repair cleanup blocker".

If cleanup or research agents need long-running investigation, they keep
scratch documents. Scratch documents are running notes only, never authority.
They must be integrated into the relevant report or decision packet, then
archived, quarantined, or deleted before the cleanup pass closes.

## Anti-Context-Bleed Rules

At every begin/end boundary I reread this workflow and the active workstream
packet. I do this before assuming I remember the sequence.

Context bleed signals:

- I cannot tell whether a fact belongs to Phase One, Phase Two, Phase Three, or
  an abandoned runtime-prod stack.
- A report, scratch doc, or agent note starts acting like authority.
- I am carrying a conclusion from memory without a current authority file or
  gate.
- I am about to promote proof without manifest, diagnostic, and gate agreement.
- I am about to continue because of momentum rather than a current packet.

When this happens I create a discrete stopping point, record current state in
the active report or handoff, clean scratch/stale inputs, and restart from the
recovery gate.

Scratch docs, temporary notes, stale agent outputs, and obsolete work plans must
be archived, deleted, or clearly marked before they can confuse the next cycle.
No deferred item may live only in chat or only in this workflow.

## Program Workstream Anchor

The Phase Two program workstream document is the Level 2 sequence anchor:

```text
tools/runtime-realization-type-env/evidence/workstreams/2026-04-30-phase-two-production-readiness-program-workstream.md
```

I reopen it whenever I enter the program, open a child workstream, recover from
compaction, reassess workstream order, or prepare closeout.

I use it as coordination authority for Phase Two sequence and scope. I do not
use it as runtime proof authority. Runtime/proof authority remains:

1. canonical runtime spec pinned by `proof-manifest.json`;
2. lab runbook and local lab `AGENTS.md`;
3. `design-guardrails.md`;
4. `proof-manifest.json`;
5. `runtime-spine-verification-diagnostic.md`, `spine-audit-map.md`, and
   `focus-log.md`.

Phase Two stays lab-contained. Phase Three owns final structure, Nx enforcement
boundaries, Nx generators, generator idempotency, and ratchet/lock mechanics.
Production code remains out of scope unless the user explicitly changes scope.

## Workstream Template Rule

Every child workstream must explicitly revisit:

```text
tools/runtime-realization-type-env/evidence/workstreams/README.md
tools/runtime-realization-type-env/evidence/workstreams/TEMPLATE.md
```

I do not rely on memory for the template.

Designing the child workstream is part of the child workstream. It is not
informal pre-chat and not a skipped step. A child workstream opens with a
template-backed packet before implementation.

Each child workstream must include:

- opening packet;
- prior workstream assimilation;
- output contract;
- expected focused and composed gates;
- phase-local agent topology;
- implementation approach;
- verification;
- layered leaf and parent reviews;
- proof-status handling;
- deferred inventory;
- closeout;
- next workstream packet.

If a child workstream cannot satisfy this structure, I record the process
tension and either repair the workflow before continuing or stop with a named
blocker.

## Agent Rules

Agents provide evidence and critique. They do not become authority.

Explorer agents are for:

- fact finding;
- file inventory;
- search/mechanical checks;
- bounded codebase questions;
- link/path/reference discovery.

I do not trust explorer conclusions. I can use their retrieved evidence, then I
verify and reason from authority files and source.

Default or strategy agents are for:

- reasoning and synthesis;
- architecture/DX review;
- adversarial critique;
- evidence honesty;
- decision-pressure analysis;
- migration derivability;
- proof-boundary review.

If there is no dedicated strategy-agent type available, I use default agents for
strategy/reasoning lanes.

Concurrency rule:

- no more than 6 active agents in one phase;
- 1-4 is preferred;
- use a full fleet only when the workstream needs independent lanes, not by
  habit.

Every agent prompt must include objective, authority stack, relevant files,
non-goals, proof boundaries, output contract, and escalation conditions. I
synthesize and verify agent output before changing proof status, diagnostic
status, or program sequence.

For heavier research/evaluation lanes, each agent keeps a scratch document
while working. This is where they preserve running notes, evidence candidates,
false starts, and unresolved threads so context does not drift. The final agent
output is a concise internal report for the host/DRA with evidence, confidence,
disposition, and what the report must not be used to prove. Agents do not
report to the user. I integrate that report into real artifacts as appropriate.

Scratch document lifecycle:

1. Use scratch only when the lane is deep enough that memory-only notes would
   be risky.
2. Mark scratch clearly as `scratch`, `not authority`, and tied to one
   workstream, phase, lane, and agent.
3. Prefer an active scratch location that cannot be mistaken for a completed
   report, such as
   `tools/runtime-realization-type-env/evidence/workstreams/_scratch/<workstream>/<lane>.md`.
4. Before closeout, integrate useful conclusions into the workstream report,
   manifest, diagnostic, focus log, decision packet, or other real artifact.
5. Then delete the scratch file, move it to an archive/provenance location, or
   quarantine it with an explicit non-authority header. No intermediate scratch
   file may remain beside final artifacts without that disposition.

## Ownership And Completion Checkpoint

Once Phase Two opens, I am responsible for completing the entire program
workstream through closeout.

I assume the user will not be available and may only give occasional,
unexpected nudges. I do not rely on the user to remember the next step, enforce
process, answer routine questions, or tell me to continue. User silence is not a
stop condition.

I proceed calmly through structured coordination:

1. recover context;
2. clean the workspace if needed;
3. open the current workstream with the template;
4. run bounded evidence and design loops;
5. implement only inside the accepted containment boundary;
6. verify with named gates;
7. run leaf reviews before parent reviews;
8. promote only earned proof strength;
9. close with deferred inventory and next packet;
10. continue until Phase Two program closeout.

I stop only for:

- explicit user control input;
- failed proof gate requiring repair or replan;
- spec hash drift;
- Graphite/worktree blocker;
- parent-review invalidation;
- a critical design wall that I already anticipated and that would
  fundamentally renegotiate architecture, public-DX law, vendor/product policy,
  topology, or migration sequence.

If the issue is final implementation detail, local workflow mechanics, evidence
labeling, cleanup disposition, or a decision that can be fenced honestly as a
residual, I choose the conservative path and continue without asking the user.

A single green child workstream, PR, report, or useful artifact is not program
completion. The Phase Two closeout artifact is the completion marker.

## Program-Wide Loop

This workflow is not a launch note for child workstream 1. It is my
program-wide operating rule for every Phase Two child workstream until final
program closeout.

A child workstream closeout is a boundary, not a stopping point. After each
child closes, I clean up, carry its accepted artifacts and next packet into the
next child, reset from the anchors, and continue. I am not done until the final
Phase Two closeout artifact exists and records proof categories, residuals,
migration-decision evidence, phase-three handoff inputs, verification, review,
and clean repo/Graphite state.

For every child workstream, I repeat this loop:

1. Recover context from this Level Zero workflow, the Phase Two program
   workstream, the active or latest report, the manifest, the diagnostic, the
   spine map, and the focus log.
2. Verify repo, Graphite, Nx, and manifest-pinned spec state before opening the
   workstream.
3. Open the child workstream with `workstreams/TEMPLATE.md`, including
   objective, authority inputs, output contract, expected gates, phase-local
   agent topology, stop conditions, and closure criteria.
4. Run the workstream's discovery, design, implementation, verification,
   review, and proof-status handling at the rigor required by that proof slice.
5. Use Explorer agents only for fact-finding and mechanical inventory; use
   default or strategy agents for reasoning, review, adversarial critique, and
   evidence honesty.
6. Close the workstream with gates recorded, leaf and parent reviews recorded,
   proof/non-proof deltas handled, deferred items assigned authority homes,
   scratch disposed, and repo/Graphite state clean or explicitly blocked.
7. Produce the next workstream packet.
8. Reset from this workflow and the Phase Two program workstream, then
   continue into the next child workstream unless a stop condition applies.

The Phase Two sequence is:

1. Program Re-grounding And Evidence Recertification.
2. Contained Production-Critical Scenario And Proof Ledger.
3. Effect + Provider/Resource/Config/Secret Spine.
4. Server oRPC/Elysia Live Boundary.
5. Async/Inngest Live Boundary.
6. Telemetry, Logging, HyperDX, Catalog Observation.
7. Integrated Runtime-Spine Rehearsal.
8. Closeout And Phase Three Handoff.

The order can change only through recorded evidence, failed gates,
parent-review invalidation, explicit user control input, or a blocker that
proves the program order is wrong. A reorder is recorded in the active
workstream report and carried into the Phase Two closeout.

At every workstream boundary I record:

- current level;
- current branch and Graphite state;
- just-closed workstream and accepted artifacts;
- next workstream packet;
- deferred items to consume;
- required first reads and first gates;
- whether scratch, stale input, or context-bleed cleanup is needed.

## Execution Sequencing

The initial Level Zero document-writing sequence was:

1. Write this document first.
2. Verify repo/Graphite/Nx/spec state.
3. Run the document-only verification gates.
4. Commit the workflow document.
5. On the next implementation signal for the program, run the prelaunch
   workspace-preparation pass.

That prelaunch workspace-preparation pass is now complete. The current
execution sequence is:

1. Recover through this Level Zero workflow.
2. Verify repo/Graphite/Nx/spec state.
3. Reopen the Phase Two program workstream document.
4. Identify the next child workstream from the checkpoint, the latest
   workstream report, and the Phase Two program workstream.
5. Open that child with the workstream template, opening packet, phase-local
   planning, agents, gates, and closeout rules.
6. Close the child completely, consume its next packet, reset through the
   Program-Wide Loop above, and continue into the next child.
7. Repeat the same open/run/verify/review/close/reset loop for every remaining
   child workstream until the Phase Two closeout artifact marks program
   completion.

At each phase boundary I update only concise checkpoint fields needed for
future compaction recovery. I do not expand this workflow into a session log.

## Level Zero Checkpoint Fields

Update this block only at Level Zero boundaries or after compaction recovery.

```text
Current level: Level 2 boundary after child workstream 3 closeout; Phase Two program is open.
Current branch at latest checkpoint: codex/runtime-phase-two-provider-config-effect-spine.
Last accepted artifact: tools/runtime-realization-type-env/evidence/workstreams/2026-04-30-phase-two-provider-config-effect-spine.md.
Prelaunch cleanup report: tools/runtime-realization-type-env/evidence/workstreams/2026-04-30-phase-two-prelaunch-workspace-preparation.md.
Scenario and claim ledger: tools/runtime-realization-type-env/evidence/phase-two-production-critical-claim-ledger.md.
Provider/config/Effect proof: tools/runtime-realization-type-env/test/mini-runtime/provider-effect-spine-scenario.test.ts and manifest entry `audit.p2.provider-effect-process-spine`.
Next required action after this checkpoint: open child workstream 4, Server oRPC/Elysia Live Boundary, through the full Program-Wide Loop.
Next required gates before child workstream 4: repo/Graphite clean, Nx project truth, manifest spec hash check, child 3 next packet consumed.
Stop condition currently active: keep production route topology, final route import-safety law, product API publication policy, and Elysia proof fenced unless the server workstream installs/exercises a real mount/request lifecycle and updates vendor fidelity honestly.
Focus-log/manifest note: they mark `phase-two.provider-config-effect-spine`; child workstream 4 owns the next currentExperiment update when it opens.
```

## Verification For This Document

The initial document-writing step verified the workflow artifact and lab
structure only. The prelaunch workspace-preparation pass later cleaned the
workspace surface and recorded its own closeout.

At the current and future Phase Two boundaries, rerun the current launch gates
before opening the next child workstream:

Required commands:

```bash
git status --short --branch
gt status --short
bunx nx show project runtime-realization-type-env --json
spec_path=$(jq -r '.spec.path' tools/runtime-realization-type-env/evidence/proof-manifest.json)
actual=$(shasum -a 256 "$spec_path" | awk '{print $1}')
expected=$(jq -r '.spec.sha256' tools/runtime-realization-type-env/evidence/proof-manifest.json)
test "$actual" = "$expected"
bunx nx run runtime-realization-type-env:structural
git diff --check
```

Optional because this file lives under lab evidence:

```bash
bunx nx run runtime-realization-type-env:report
```

Do not run the Phase Two program from this document-writing step.
