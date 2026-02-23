# `@rawr/support-triage`

`@rawr/support-triage` models the **support-triage** capability with explicit module authority:

- `domain/`: business concepts and invariants (`TriageWorkItem`, status model, domain errors)
- `service/`: use-case lifecycle logic and persistence interfaces
- `client/`: oRPC adapter layer (context, procedures, error map, router)

## Router-first internal calling

This package exports `supportTriageClientRouter` and `SupportTriageClient`.
Host/plugin composition creates in-process clients via `createRouterClient(...)` with caller-owned context.

## Hypothetical vs Production

- This package is intentionally example-oriented and non-normative.
- It is safe to use as a reference for package/plugin boundary patterns.
- It is not a production-ready implementation of a real support platform.
