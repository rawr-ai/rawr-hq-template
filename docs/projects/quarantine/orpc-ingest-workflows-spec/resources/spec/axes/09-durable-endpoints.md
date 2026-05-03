# Axis 09: Durable Endpoints vs Durable Functions

## Canonical Core Reference
- Canonical subsystem policy and global invariants: [ARCHITECTURE.md](../ARCHITECTURE.md).
- Architecture-level decision authority: [DECISIONS.md](../DECISIONS.md).
- This axis is a focused slice and does not override canonical core policy.

## Axis Opening
- **What this axis is:** the canonical policy slice for durable endpoint usage relative to canonical durable function execution.
- **What it covers:** first-party durability model choice and strict additive-only constraints for durable endpoint adapters.
- **What this communicates:** durable endpoints can exist only as non-overlapping ingress adapters and cannot become parallel trigger authoring paths.
- **Who should read this:** workflow/runtime authors and reviewers deciding whether a durable endpoint is policy-compliant.
- **Jump conditions:** for workflow trigger boundary posture, jump to [08-workflow-api-boundaries.md](./08-workflow-api-boundaries.md); for split/anti-dual-path guardrails, jump to [03-split-vs-collapse.md](./03-split-vs-collapse.md).


## In Scope
- Canonical durability model choice for first-party workflows.
- Constraints for optional durable endpoint adapters.
- Guardrails preventing parallel first-party trigger paths.

## Out of Scope
- General workflow trigger contract/router authoring (see [08-workflow-api-boundaries.md](./08-workflow-api-boundaries.md)).
- Host mount internals (see [07-host-composition.md](./07-host-composition.md)).

## Canonical Policy
1. Durable functions are canonical for first-party durable workflow execution.
2. Durable endpoints MAY be used only as additive ingress adapters for non-overlapping ingress needs.
3. Durable endpoints MUST NOT create a parallel first-party trigger authoring path for the same capability behavior.

## Why
- Maintains one contract path for caller-facing APIs.
- Allows targeted ingress flexibility without semantic drift.

## Trade-Offs
- Not all ingress styles collapse into one code shape.
- This is acceptable and prevents client confusion.

## Canonical Placement
```text
plugins/workflows/<capability>/src/
  functions/*            # canonical durable execution
  durable/*              # optional additive ingress adapters only
```

## Allowed vs Disallowed
- Allowed:
  - Durable endpoint adapter for ingress needs that do not overlap caller-facing trigger behavior.
  - Continued canonical first-party trigger authoring on oRPC workflow trigger surfaces.
- Disallowed:
  - Durable endpoint as alternate first-party trigger authoring path for the same behavior.

## References
- Inngest: [Durable endpoints](https://www.inngest.com/docs/learn/durable-endpoints)
- Inngest: [Functions](https://www.inngest.com/docs/reference/functions/create)
- Inngest: [Serve](https://www.inngest.com/docs/reference/serve)
- Packet entrypoint: `../ARCHITECTURE.md`

## Cross-Axis Links
- Workflow trigger boundary ownership: [08-workflow-api-boundaries.md](./08-workflow-api-boundaries.md)
- Split/anti-dual-path posture: [03-split-vs-collapse.md](./03-split-vs-collapse.md)
