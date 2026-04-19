# Ports & Adapters Orchestration Workflow

IMPORTANT: THIS DOCUMENT WAS PAUSED FOR ABOUT ONE MONTH; WE NEED TO COME BACK TO IT, BUT THINGS HAVE ALSO CHANGED SO DO NOT TAKE THIS AS SOURCE OF TRUTH JUST YET

This is the coordinator-facing workflow for running the next
`example-todo` integration rounds.

Use this together with:

- `ACTIVE_GROUNDING.md`
- `ADAPTER_POSTURE.md`
- `ADAPTER_AGENT_WORKFLOW.md`

This document describes the team design, orchestration rules, watcher behavior,
context-stacking policy, and phase gates.

## Objective

Run realistic integration slices one at a time so we can learn how real
providers like PostHog and Drizzle change the package shape without rushing into
implementation or reinforcing the wrong seams.

Success means:

- the worker is grounded before design
- design is written and reviewed before code
- implementation follows an approved mini-solution
- review compares code back against design and posture
- learnings are captured for scaffold/docs/architecture decisions

## Team Design

This is not a swarm. It is a directed, artifact-driven pipeline with one worker
slice active at a time.

### Axis position

- Objective precision: specified and verifiable
- Coupling: sequential with tight handoff points
- Autonomy: directed through guardrails and approval gates
- Composition stability: stable coordinator, ephemeral workers/watchers
- Context distribution: strongly partitioned and just-in-time
- Verification mode: process-traced for design, outcome-checked for code

### Team topology

The default team is:

1. coordinator
2. one default worker agent
3. one watcher agent for document usability
4. optional review/synthesis agent after implementation

Do not add more agents unless their contribution exceeds coordination cost.

## Role Contracts

### Coordinator

Owns:

- objective framing
- context distribution
- artifact directory assignment
- phase gates
- compaction rituals
- watcher invocation
- approval or redirect decisions
- final synthesis across slices

The coordinator is the only role allowed to advance an agent from one phase to
the next.

### Worker agent

Owns one slice at a time:

- grounding
- mini-solution design
- implementation
- implementation note

The worker does not self-approve its own phase advancement.

### Watcher agent

The watcher is a default agent used as a document usability shaper, not as a
solution author.

It applies information-design principles to artifacts that will be used in the
next phase, especially:

- grounding documents
- mini-solution documents
- implementation notes when a later reviewer needs a clean handoff

The watcher should:

- improve hierarchy, scent, and handoff clarity
- identify ambiguity, missing structure, and hidden assumptions
- avoid redesigning the solution itself

### Optional review or synthesis agent

Use only when helpful after implementation.

Owns:

- comparing implementation against mini-solution and posture
- extracting generalized learnings
- proposing doc/scaffold updates

## Information Flow

Design the team around artifact handoffs, not status chatter.

### Primary information carriers

- active grounding document
- worker scratch document
- worker grounding document
- worker mini-solution document
- worker implementation note
- watcher reshaped artifact or watcher critique note

### Communication rule

Do not ping agents for progress.

The scratch document is the heartbeat. If the scratch document is moving, the
agent is working. Only interrupt when:

- direction must change
- the phase must be stopped
- a hard constraint changed
- a blocking clarification genuinely cannot be discovered locally

## Artifact Directory Pattern

Before launching a worker, the coordinator should assign one artifact location
for that slice.

Recommended shape:

- one directory per slice
- stable filenames inside it:
  - `SCRATCH.md`
  - `GROUNDING.md`
  - `MINI_SOLUTION.md`
  - `IMPLEMENTATION_NOTE.md`
  - optional watcher notes

The point is not the exact path. The point is stable discoverability and phase
durability.

## Context Stacking Policy

Every phase gets the smallest context packet that can support correct work.

### Grounding packet

Send only:

- the current `ACTIVE_GROUNDING.md`
- `DECISIONS.md`
- `guidance.md`
- `ADAPTER_POSTURE.md`
- `ADAPTER_AGENT_WORKFLOW.md`
- the relevant live code surfaces
- the relevant skill
- targeted oRPC references only if needed

Do not send broad transcript history by default.

### Mini-solution packet

Send only:

- approved grounding document
- active grounding document
- narrow follow-up references needed to resolve open questions

### Implementation packet

Send only:

- approved mini-solution document
- any watcher-shaped version of that document
- the code surfaces named in the mini-solution
- validation expectations

### Review packet

Send only:

- approved mini-solution document
- implementation note
- changed files and validation results
- posture docs needed to check drift

## Phase Gates

No phase advances automatically.

### Gate 0. Launch readiness

Before launching a worker, the coordinator must define:

- the slice question
- why this slice matters now
- what success looks like for this slice
- what is explicitly out of scope

If that is unclear, do not launch.

### Gate 1. Grounding approval

After the worker produces `GROUNDING.md`:

1. inspect the scratch document if needed
2. run or delegate a watcher pass if the grounding doc will be reused heavily
3. decide one of:
   - grounded enough, proceed
   - re-ground with a narrower follow-up question
   - stop because posture/docs are still conflicted

Do not move to design until this gate passes.

### Gate 2. Mini-solution approval

After the worker produces `MINI_SOLUTION.md`:

1. send the doc to a watcher agent for information-design shaping
2. review whether the document clearly states:
   - capability needed
   - classification
   - recommended shape
   - alternatives rejected
   - files expected to change
   - non-goals
   - risks
   - validation plan
3. decide one of:
   - approved for implementation
   - needs redesign
   - split into another slice first

Do not move to coding until this gate passes.

### Gate 3. Implementation approval for review

After implementation:

1. require an implementation note
2. review validation output
3. decide whether to:
   - send to review
   - send back for correction
   - split remaining work into another slice

### Gate 4. Review and synthesis

After review:

1. identify whether the code matched the mini-solution
2. capture generalized learnings
3. decide whether those learnings belong in:
   - posture docs
   - guidance docs
   - scaffold rules
   - another focused slice

## Compaction Ritual

Every time a phase-completing artifact exists and will serve the next phase:

1. stop the agent's current phase
2. send `/compact`
3. wait for explicit confirmation that compaction is complete
4. only then send the next-phase packet

The surviving context is the artifact set, not the raw transcript.

This should happen at least after:

- grounding
- mini-solution design
- implementation

## Watcher Workflow

Watcher agents are for document usability, not continuous supervision.

Use them at phase boundaries, especially for mini specifications and
mini-solution documents.

Watcher checklist:

1. Is the artifact easy to skim and re-ground from?
2. Are headings predictive?
3. Are the key decisions and non-goals prominent?
4. Can the next phase begin from this document without transcript archaeology?
5. Does the artifact distinguish observed facts from proposed changes?

If not, the watcher should reshape the document or produce a short critique note
that the coordinator can fold back into the artifact before phase advance.

## ORPC Research Rule

Workers should ground themselves in what oRPC makes possible, but this research
must stay subordinate to the slice question.

The coordinator should explicitly frame ORPC exploration as:

- enough to understand the capability surface
- enough to understand our wrapper posture and hard boundaries
- not a license for broad exploratory wandering

The goal is grounded design, not generic oRPC study.

## Rewrite-Allowed Rule

The coordinator must actively frame each slice so the worker understands:

- current analytics and SQL/database seams may be rewritten if needed
- realistic implementation beats preserving legacy shape
- if the right answer is too large for one slice, the worker should split the
  work rather than compromise the design

This rule should be restated in the launch packet whenever the slice touches
analytics or SQL/database middleware.

## Failure Modes To Guard Against

- launching workers with vague objectives
- over-sharing context too early
- skipping watcher review on phase-critical docs
- treating compaction as optional
- allowing design to live only in chat rather than in artifacts
- letting workers silently widen scope during implementation
- using multiple active workers before the handoff and review loop is stable

## Default Operating Pattern For The Next Round

For the next integration round, the default should be:

1. choose one slice
2. launch one default worker
3. ground
4. compact
5. design mini-solution
6. watcher-shape the mini-solution
7. compact
8. implement approved scope
9. compact
10. review and synthesize
11. decide whether the next slice should change based on what was learned

That gives us a real learning loop instead of parallelized guesswork.
