# Decisions

## Decision #1 (2026-02-25)

### Question
Do we automatically expose/export a contract derived from the router from day one?

### Decision
No, not for now.

### Why
For in-process usage, the router is the thing we actually need. We create the client directly from the router (`createRouterClient(router, { context })`), so extracting/exporting a contract is not required to make this package usable internally.

This domain package is also not being exposed publicly or externally.

We are not doing this as part of an external/OpenAPI transition path either, because we already have a separate boundary for that in this repo: the plugin system wraps these internal clients for external-facing surfaces.

Given that, the only clear value of extracting a contract right now is tooling around explicit drift/snapshot checks. That is still a valid future step, but it is intentionally deferred.

### Follow-up posture
Keep this package router-first and in-process-first.

Only add a derived contract later if we explicitly need contract-level drift/snapshot checks (or another concrete consumer requirement emerges).

## Guidance #1 (2026-02-25)

### Question
Where should ORPC error definitions live when we need procedure-level precision?

### Guidance
Use a hybrid placement model based on actual sharing:

- Service-level errors for failures shared across modules (for example generic database/not-found surfaces).
- Module-level errors for failures shared within one module.
- Procedure-local errors for truly local behavior.

Each procedure should still declare only the errors it can throw via `.errors(...)`. Shared definitions can be reused, but declaration remains procedure-specific.
