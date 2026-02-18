# Axis 09: Durable Endpoints vs Durable Functions

## In Scope
- Canonical durability model choice for first-party workflows.
- Constraints for optional durable endpoint adapters.
- Guardrails preventing parallel first-party trigger paths.

## Out of Scope
- General workflow trigger contract/router authoring (see [AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md](./AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md)).
- Host mount internals (see [AXIS_07_HOST_HOOKING_COMPOSITION.md](./AXIS_07_HOST_HOOKING_COMPOSITION.md)).

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
- Agent I: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_I_SPLIT_HARDEN_RECOMMENDATION.md:9`

## Cross-Axis Links
- Workflow trigger boundary ownership: [AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md](./AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md)
- Split/anti-dual-path posture: [AXIS_03_SPLIT_VS_COLLAPSE.md](./AXIS_03_SPLIT_VS_COLLAPSE.md)
