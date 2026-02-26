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
