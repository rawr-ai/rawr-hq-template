# Ports & Adapters Agent Workflow

IMPORTANT: THIS DOCUMENT WAS PAUSED FOR ABOUT ONE MONTH; WE NEED TO COME BACK TO IT, BUT THINGS HAVE ALSO CHANGED SO DO NOT TAKE THIS AS SOURCE OF TRUTH JUST YET

This is the worker-facing workflow for integration stress-tests like PostHog and
Drizzle inside `example-todo`.

Use this alongside:

- `ACTIVE_GROUNDING.md` for the current phase frame
- `ADAPTER_POSTURE.md` for boundary classification
- `ADAPTER_ORCHESTRATION_WORKFLOW.md` for coordinator and watcher behavior

This document is about how a single worker agent should move through the work.
It is intentionally phase-gated. The worker should not improvise its own
sequence.

## Purpose

We are not trying to "wire in a provider" as fast as possible.

We are using real integrations to pressure-test:

- which ports should exist
- what host adapters should look like
- what belongs in provider middleware
- what should remain native oRPC versus wrapped by our SDK seam
- which current seams are transitional and should be rewritten
- what should become scaffold and docs defaults later

The point is to discover the right shape, not to preserve the current one.

## Non-Negotiable Operating Posture

- Assume current analytics and SQL/database middleware may be rewritten
  completely if the grounded solution requires it.
- Do not preserve legacy behavior just because it already exists.
- Do not invent a hidden DSL or speculative plugin-boundary system.
- Stay as oRPC-native as possible, but respect the repo's explicit SDK/dev wraps
  and hard boundaries.
- Treat `ADAPTER_POSTURE.md`, `DECISIONS.md`, and `ACTIVE_GROUNDING.md` as hard
  posture documents, not optional reading.
- Do not start editing code during grounding or mini-solution design.
- If the grounded answer implies a different slice or a prerequisite slice,
  say so. Do not force an underspecified implementation through anyway.

## Context Stacking Rule

Context is progressive and just-in-time.

Only ground in what is needed for the current phase.

### During grounding

Ground only in:

1. `ACTIVE_GROUNDING.md`
2. `DECISIONS.md`
3. `guidance.md`
4. `ADAPTER_POSTURE.md`
5. the live `example-todo` code surfaces relevant to the integration
6. the relevant skill for the technology being investigated
7. targeted oRPC references and playground examples only if needed

Do **not** ingest broad session history unless the coordinator explicitly says a
critical gap remains unresolved.

### During mini-solution design

Work primarily from:

- the worker's own grounding document
- the active grounding document
- the smallest additional packet needed to resolve open questions

### During implementation

Work primarily from:

- the approved mini-solution document
- the worker's implementation scratch
- only the code files required by the approved design

## ORPC Grounding Requirement

Before solution design, the worker must understand both:

- what oRPC enables natively
- what this repo intentionally wraps, restricts, or stabilizes through the SDK
  seam

In particular, think through:

- middleware layering
- provider/dependent context flow
- `context.deps` versus `context.provided.*`
- service-wide required middleware versus additive module/procedure middleware
- where the repo stays close to native oRPC
- where the repo adds wrappers for guarantees, boundaries, or authoring shape

Use the mini oRPC playgrounds and focused upstream examples only to clarify
middleware composition and provision patterns. Do not wander broadly once the
required mechanism is understood.

## Artifact Ladder

The worker produces one durable artifact per phase boundary.

### 1. Scratch document

This is the worker's heartbeat and working log.

Capture:

- sources checked
- observations
- conflicts found
- hypotheses
- open questions
- design notes
- implementation notes

This replaces status pings. The coordinator should inspect the scratch document
rather than interrupting the worker.

### 2. Grounding document

This is the compaction-surviving artifact for the grounding phase.

It must capture:

- observed current state
- transitional seams
- hard constraints
- what the worker believes the real question is
- what must not be reinforced accidentally
- unresolved questions that block design

### 3. Mini-solution document

This is the compaction-surviving artifact for the design phase.

It must capture:

- the capability the package actually needs from the provider
- the classification of each major piece:
  - packaged SDK port
  - provider middleware
  - framework/internal integration
  - host-side concrete integration
  - service-local runtime behavior
- the recommended solution shape
- alternatives considered and why they were rejected
- exact seams expected to change
- exact files likely to change
- non-goals
- risks and failure modes
- validation plan
- whether the work should proceed now or be split into another slice

### 4. Implementation note

This is the compaction-surviving artifact for the implementation phase.

It must capture:

- what changed
- where implementation differed from the mini-solution, if at all
- validation run
- known risks
- what should be reviewed for architecture drift

## Phase Model

Every phase is strict. Do not skip ahead.

### Phase 0. Intake

Inputs from coordinator:

- the current active grounding document
- the specific slice/question
- the worker artifact location
- the minimal context packet for this phase

Worker action:

- confirm the mission from artifacts, not from broad transcript history
- open the scratch document immediately

### Phase 1. Grounding

Worker actions:

1. Read the current active grounding document.
2. Read `DECISIONS.md`, `guidance.md`, and `ADAPTER_POSTURE.md`.
3. Ground in the relevant live code surfaces.
4. Introspect the relevant skill:
   - Drizzle work -> `drizzle`
   - PostHog work -> `posthog`
5. Understand the relevant oRPC middleware model and the repo's wrapper posture.
6. Write scratch notes continuously.
7. Produce the grounding document.

Hard rule:

- no code edits in this phase

Stop conditions:

- if docs and live code conflict on a hard boundary, stop and surface it
- if the worker cannot classify the integration with high confidence, stop and
  surface it

### Phase 1 Exit Ritual

When the grounding document is complete:

1. stop phase work
2. notify the coordinator through the artifact, not through chatty status
3. wait for the coordinator to send `/compact`
4. confirm compaction is complete
5. do not begin design until the next phase packet arrives

### Phase 2. Mini-Solution Design

Worker actions:

1. Re-ground from the compacted state using:
   - the grounding document
   - the active grounding document
   - any narrow follow-up sources explicitly requested
2. Restate the real package need, not the vendor feature list.
3. Classify the integration shape.
4. Think through the agent journey:
   - what context is available initially
   - what middleware contributes to service context
   - what must be host-owned
   - what must be package-facing
   - what should remain native oRPC
   - what the SDK seam should enforce
5. Produce the mini-solution document.

Hard rules:

- no code edits in this phase
- do not move to implementation on "first plausible answer"
- if the right answer is "split the slice," say so explicitly

### Phase 2 Exit Ritual

When the mini-solution document is complete:

1. stop phase work
2. wait for watcher review and coordinator approval
3. wait for the coordinator to send `/compact`
4. confirm compaction is complete
5. do not begin implementation until an approved implementation packet arrives

### Phase 3. Implementation

Worker actions:

1. Re-ground from the approved mini-solution.
2. Implement only the approved solution scope.
3. Keep the scratch document current.
4. Write the implementation note before handing off.

Hard rules:

- do not preserve a bad seam because it is already there
- do not expand scope silently
- if implementation reveals the mini-solution is wrong, stop and surface the
  mismatch rather than improvising a second design in code

### Phase 3 Exit Ritual

When the implementation note is complete:

1. stop phase work
2. wait for the coordinator to send `/compact`
3. confirm compaction is complete
4. hand off to review

### Phase 4. Review Support

The worker may be asked to answer focused follow-ups after review, but review is
not assumed to be self-approval.

## Failure Modes To Guard Against

- mistaking current implementation shape for target shape
- reinforcing transitional `deps.analytics` usage
- treating a concrete host binding as a package-facing port
- skipping classification because the coding path seems obvious
- reading too much irrelevant context too early
- using broad oRPC exploration as an excuse to defer design discipline
- implementing a hidden second design because the first design was never
  written down

## One-Worker Default

Assume one worker at a time unless the coordinator explicitly chooses
otherwise.

The default pattern is:

- one worker owns one slice
- watcher agents review the worker's phase artifacts for usability and handoff
- the coordinator decides when to advance phases

This workflow is designed to make that serialized learning loop explicit.
