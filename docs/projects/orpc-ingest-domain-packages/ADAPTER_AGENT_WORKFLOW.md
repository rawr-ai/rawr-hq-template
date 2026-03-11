# Ports & Adapters Integration Workflow

This note frames how agents should approach integration stress-tests like
PostHog and Drizzle inside `example-todo`.

The purpose is not to pre-specify a solution. The purpose is to make sure
agents start from the right grounding, see the intended architecture clearly,
and then design and implement the obvious solution that follows from the
current package shape, docs, and oRPC model.

## Kickoff Frame

Use this workflow when exploring or implementing concrete integrations in
`example-todo`.

- Work from the **current Example-ToDo package** and its docs as the primary
  source of intended structure.
- Do **not** treat the current package shape as something to preserve
  mechanically; treat it as soft rails that should guide the right conclusion.
- Do **not** invent a hidden DSL or speculative plugin-boundary system.
- Do **not** optimize for the plugin-boundary story in this round. Plugin
  boundary configuration is a later concern and is out of scope unless the
  work absolutely forces a note about it.
- Assume the right answer should already be discoverable from:
  - `DECISIONS.md`
  - `guidance.md`
  - the Example-ToDo package as it exists today
  - oRPC itself, if needed

## Purpose

We are not just integrating two technologies and calling it done.

We are using real integrations to stress-test the architecture and answer:

- how package boundaries need to change
- what should become clearer or more enforceable
- what patterns repeat across integrations and should become standard

Assume the current seams may change. Do **not** treat them as fragile shapes to
preserve unless the architecture still justifies them after grounding.

## Working Frame

- Domain service packages are meant to scale from `N=1` to `N=∞`.
- They should be easy to scaffold and spin up repeatedly.
- That means every integration should be judged both for the immediate package
  and for what it implies about future package creation and maintenance.
- Use the binary capability model from `DECISIONS.md` and
  `ADAPTER_POSTURE.md`.
- Distinguish sharply between:
  - ports (`src/orpc/ports/*`)
  - host adapters (`src/orpc/host-adapters/*`)
  - provider middleware (`src/orpc/middleware/*`)
- Treat analytics-as-provider as the target posture. Do not preserve the
  current direct raw `deps.analytics` usage just because it exists in the code
  today.
- If flattening execution context is useful for handlers, keep that reshaping
  at module `setup.ts`, not at package-wide middleware scope.

## Mandatory Grounding Step

Before any design or implementation work begins, agents must complete grounding
in this exact order.

### 1. Ground in `DECISIONS.md` and `guidance.md`

Read these first to understand the intended direction, constraints, and hard
boundaries.

- Assume they are intended to be current and non-conflicting.
- If they appear to conflict with each other or with the code, record that in
  the scratch pad and grounding document rather than silently choosing one.

### 2. Ground in the Example-ToDo package as it stands right now

Read the package itself for patterns, comments, and structural intention.

Pay special attention to:

- `src/orpc/ports/*`
- `src/orpc/host-adapters/*`
- `src/orpc/middleware/*`
- `src/service/base.ts`
- `src/service/impl.ts`
- `src/service/modules/*`

Treat the current package as the main teaching/reference surface. The intended
design should be visible there, even if some seams are still transitional.

### 3. Introspect the relevant skill for the integration

Each agent should introspect the specific skill most relevant to the work it is
about to do.

Examples:

- a Drizzle-focused agent should introspect the `drizzle` skill
- a PostHog/analytics-focused agent should introspect the `posthog` skill

The point is not to defer to the skill blindly. The point is to refresh the
agent on the current tool/library mental model before it designs changes in the
package.

### 4. Backup layer: ground in oRPC itself

If needed to understand the underlying mechanism, consult oRPC docs or
playground examples.

This can happen alongside skill introspection or as the final grounding layer.

It is especially relevant for:

- middleware layering
- provider/dependent context
- execution-context expansion
- what should be done with provider middleware versus direct dependency use

## Grounding Artifacts

Each agent must produce and maintain two artifacts during the grounding step:

### Scratch pad

Ongoing working notes capturing:

- framing notes
- classification decisions
- sources/references used
- seams that changed
- unresolved questions
- candidate generalizations

### Grounding document

A short grounding note produced during the grounding step that captures the
nuance and conclusions that should survive compaction.

This grounding document is the **only** artifact that should be treated as
surviving the required post-grounding compaction.

## Required Compaction Step

After grounding is complete:

- the coordinating agent must send a `/compact` message to compact the worker
  agent
- after compaction, the agent should continue using its grounding document plus
  scratch pad as the preserved frame

Grounding is not optional, and compaction happens **after** grounding, not
before.

## Workflow After Grounding

### 1. Solution design

Only after grounding and compaction:

- restate what the technology/provider is
- restate what capability the package actually needs from it
- classify the integration
- identify which seams will likely change

### 2. Implementation design and coding

Then propose and implement the concrete code shape.

Explicitly identify:

- what belongs in packaged SDK ports
- what belongs in host adapters
- what belongs in provider middleware
- what belongs in service/module runtime behavior

### 3. Testing and review

After implementation:

- run the relevant validation
- review the changed seams against the grounding document
- record what generalized and should be fed back into docs, JSDoc, scaffold
  structure, or SDK boundaries

## Classification Step

During solution design, classify each part of the integration into one or more
of these buckets:

1. packaged SDK port
2. provider middleware
3. framework/internal integration
4. host-side concrete integration
5. service-local runtime behavior

Do not skip this step.

Also record whether the integration is:

- already supported directly by the current capability model
- exposing a gap in the model
- or proving that a currently unsupported capability must be promoted

## Important Guardrails

- Do not assume `service/adapters/` is a valid destination.
- Do not assume every needed port should be package-local.
- Do not assume generic reusable ports belong in each package; centralize them
  if they are truly generic.
- Do not treat observability as part of the adapter model by default; only
  revisit that if the integration clearly forces it.
- Do not teach agents that analytics is a raw long-term `deps.*` dependency;
  the integration work should correct that seam, not reinforce it.
- Do not introduce plugin-boundary configuration systems or hidden DSLs in this
  round.
- Do not flatten provider outputs package-wide; keep inline execution-context
  reshaping at module setup.
