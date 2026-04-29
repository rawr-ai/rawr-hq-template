# Runtime Realization Type Environment

This project is a contained spec conformance lab for the Runtime Realization spine. It is not the SDK, not the runtime, and not migration implementation.

Pinned authority for v1:

- `/Users/mateicanavra/Downloads/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
- SHA-256: `483044fa2082b75a89bc2a9da086e35a9fdd9cb91fd582415d8b3744f3e4f94b`

The pseudo-SDK in `src/sdk/**` exists only to make the spec authoring model executable by TypeScript. Canonical-looking imports such as `@rawr/sdk/effect` are local `tsconfig` aliases and must not be treated as production package exports.

The lab has two proof strengths:

- Type/shape proof: authoring signatures, descriptor refs, portable artifacts, and negative misuse cases compile or fail as expected.
- Minimal simulation proof: registry assembly, invocation-time context binding, and provider profile closure are exercised by a tiny process-runtime simulator.

It does not prove real Effect runtime semantics, actual oRPC adapter behavior, provider lowering, durable workflow scheduling, telemetry export, persistence, network transport, or bootgraph execution. Open architecture gaps stay marked as `xfail` or `todo` in `evidence/proof-manifest.json`.

## Commands

```bash
bunx nx run runtime-realization-type-env:report
bunx nx run runtime-realization-type-env:typecheck
bunx nx run runtime-realization-type-env:negative
bunx nx run runtime-realization-type-env:simulate
bunx nx run runtime-realization-type-env:structural
bunx nx run runtime-realization-type-env:gate
```

## Iteration Rule

When the spec changes, update the smallest pseudo-SDK surface and fixture set needed to prove the new spine rule. Move the related proof manifest entry from `todo` or `xfail` to `proof` only when the type or simulation evidence is green.

If a change requires production code, split it into migration work. This tool may reveal a spec gap; it must not resolve architecture silently.

Use `evidence/focus-log.md` to record the current experiment and `evidence/vendor-fidelity.md` to keep vendor-shaped facades honest. Do not expand either into a parallel planning system.
