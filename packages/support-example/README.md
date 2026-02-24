# `@rawr/support-example`

`@rawr/support-example` models the **support-example** capability with explicit module authority:

- `domain/`: business concepts and invariants (`TriageWorkItem`, status model, domain errors)
- `contract/`: oRPC contract surface organized by caller navigation (`triage/items/{request,list,get,start,complete}.ts`)
- `service/`: lifecycle logic, persistence interfaces, and procedure handlers
- `client/`: exported in-process router shape + client type

## Router-first internal calling

This package exports `supportExampleClientProcedures` and `SupportExampleClient` with nested calls:

- `client.triage.items.request(...)`
- `client.triage.items.list(...)`
- `client.triage.items.get(...)`
- `client.triage.items.start(...)`
- `client.triage.items.complete(...)`

Host/plugin composition creates in-process clients via `createRouterClient(...)` with caller-owned context.

## Hypothetical vs Production

- This package is intentionally example-oriented and non-normative.
- It is safe to use as a reference for package/plugin boundary patterns.
- It is not a production-ready implementation of a real support platform.
