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

## Decision #2 (2026-02-26)

### Question
How should we standardize package structure for ORPC domain examples and scaffolding as package size grows?

### Decision
Use pre-structured packages with a consistent layout across package sizes:

- always-present `boundary/` for package boundary scaffolding,
- always-present `modules/` for service modules and router composition,
- stable root entry surface via `index.ts`.

Do not pick a different top-level structure based on package size. Keep one structure and vary only the internal template content.

### Why
We are optimizing for fast comprehension and predictable navigation for both humans and AI agents.

When top-level structure changes by size tier, agents and developers spend cycles re-learning layout conventions instead of extending behavior. A fixed structural contract reduces ambiguity and keeps the differences focused on real capability axes (topology/composition/reuse/coordination/governance), not folder shape drift.

### Implementation posture
Use dev tooling/CLI scaffolding flags to select template depth (for example simple/intermediate/advanced) while preserving the same core package structure.

The flags choose what gets pre-populated, not where major boundary/module folders live.

## Decision #3 (2026-02-26)

### Question
For our router-client-only domain packages, should we keep the domain-catalog-to-ORPC mapping + `unwrap` flow (`createOrpcErrorMapFromDomainCatalog` + unwrap helpers), or switch to a more direct ORPC-native boundary pattern?

### Decision
Switch to ORPC-native boundary errors and remove the legacy indirection from active paths.

Concretely:

- Procedures explicitly declare their boundary errors with `.errors(...)`.
- Procedures map known domain failures directly to declared ORPC errors at the boundary.
- `neverthrow` remains available internally where composition/recovery is useful, but it is not an always-on repository contract.
- We will remove `createOrpcErrorMapFromDomainCatalog` + `unwrap` interactions across affected code, in sequence (example package first, broader cleanup second).

### Why
Our architecture has one hard entrypoint: callers use the in-process ORPC router client.

Given that boundary, the cleanest and most readable contract is the procedure-level ORPC error surface itself. The catalog-to-map + unwrap pattern creates an extra translation layer that increases cognitive load for humans and agents without adding boundary value in this setup.

This decision also collapses error handling into one obvious flow:

1. Internal logic raises domain failures (and may optionally use neverthrow internally).
2. Procedure boundary declares exactly what can be returned.
3. Procedure converts known failures into those declared ORPC errors.

### References

- ORPC procedure model and error declarations: <https://orpc.dev/docs/procedure>
- ORPC context/middleware model: <https://orpc.dev/docs/context>, <https://orpc.dev/docs/middleware>
- ORPC in-process router clients: <https://orpc.dev/docs/client/server-side>

### Implementation posture

- Keep boundary contracts explicit and narrow per procedure.
- Prefer direct mapping at procedure handlers over generic/global conversion layers.
- Use neverthrow surgically where it helps internal composition/recovery; do not force it as repository API shape.
