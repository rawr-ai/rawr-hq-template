# Adapter Integration Workflow

This note frames how agents should approach integration stress-tests like
PostHog and Drizzle.

It is intentionally short and directional. The goal is not to micromanage the
implementation, but to keep the work aligned with the architecture we are
trying to validate.

## Purpose

We are not just integrating two technologies and calling it done.

We are using real integrations to stress-test the architecture and answer:

- how package boundaries need to change
- what should become clearer or more enforceable
- what patterns repeat across integrations and should become standard

Assume the current seams may change. Do **not** treat them as fragile shapes to
preserve unless the architecture still justifies them after classification.

## Working Frame

- Domain service packages are meant to scale from `N=1` to `N=∞`.
- They should be easy to scaffold and spin up repeatedly.
- That means every integration should be judged both for the immediate package
  and for what it implies about future package creation and maintenance.
- Use the binary capability model from `DECISIONS.md` and `ADAPTER_POSTURE.md`.
  Do not invent in-between capabilities while exploring.

## Workflow

### 1. Start with framing

Before proposing code, restate:

- what the technology/provider is
- what capability the package actually needs from it
- whether the current seam looks obviously temporary, obviously durable, or
  unclear

### 2. Classify the integration first

Classify each part of the integration into one or more of these buckets:

1. packaged SDK contract
2. provider middleware
3. framework/internal integration
4. host-side concrete integration
5. service-local runtime behavior

Do not skip this step.

Also record whether the integration is:

- already supported directly by the current capability model
- exposing a gap in the model
- or proving that a currently unsupported capability must be promoted

### 3. Track how the current shape changes

We expect the current implementation to change.

Explicitly record:

- which existing seams bent or broke
- what changed in response
- whether the change feels package-specific or likely to generalize
- what this implies about the architecture/docs/patterns

### 4. Then propose code shape

Only after framing and classification:

- propose the concrete code shape
- identify what belongs in the package vs the host
- identify what belongs in packaged SDK vs service layer vs provider middleware

### 5. Feed the learning back

If the integration reveals a repeatable pattern, call it out explicitly so it
can be encoded later in:

- docs
- JSDoc
- scaffold structure
- SDK boundaries

## Scratch Pad Requirement

Each agent should maintain its own scratch pad while working.

The scratch pad should capture:

- local framing notes
- classification decisions
- sources/references used
- seams that changed
- unresolved questions
- candidate generalizations for future integrations

This is required because the point of the exercise is not just the end state of
the code. The point is also what we learn from how the integration forced the
architecture to move.

## Important Guardrails

- Do not assume `service/adapters/` is a valid destination under the current model.
- Do not assume every needed contract should be package-local.
- Do not assume generic reusable contracts belong in each package; centralize
  them if they are truly generic.
- Do not treat observability as part of the adapter model by default; only
  revisit that if the integration clearly forces it.
- Do not assume plugin ownership of a runtime surface means plugin ownership of
  concrete capability adapters. In this architecture, runtime host composition
  owns concrete adapter wiring; plugins/packages consume ports.
