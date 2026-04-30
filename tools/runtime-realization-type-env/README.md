# Runtime Realization Type Environment

This project is a contained spec conformance lab for the Runtime Realization spine. It is not the SDK, not the runtime, and not migration implementation.

Pinned authority for the current lab:

- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
- The SHA-256 is recorded in `evidence/proof-manifest.json` and verified by the structural guard.

The SDK facade in `src/sdk/**` exists only to make the spec authoring model executable by TypeScript. Canonical-looking imports such as `@rawr/sdk/effect` are local `tsconfig` aliases and must not be treated as production package exports.

The lab has four proof strengths:

- Type/shape proof: authoring signatures, descriptor refs, portable artifacts, and negative misuse cases compile or fail as expected.
- Vendor proof: real `effect@3.21.2`, TypeBox, oRPC, Inngest, and Bun boundary behavior is exercised only in narrow lab lanes.
- Mini-runtime proof: descriptor table/registry assembly, runtime-owned Effect execution, adapter delegation, deployment handoff, and invocation-time context binding run through a contained miniature runtime.
- Compatibility simulation proof: the original simulation lane remains as a compatibility check while the mini-runtime lane grows.

It does not prove production oRPC adapter behavior, provider plan final shape, durable workflow scheduling, telemetry export, persistence, network transport, or bootgraph execution. Open architecture gaps stay marked as `xfail` or `todo` in `evidence/proof-manifest.json`.

## Commands

```bash
bunx nx run runtime-realization-type-env:report
bunx nx run runtime-realization-type-env:typecheck
bunx nx run runtime-realization-type-env:negative
bunx nx run runtime-realization-type-env:vendor-effect
bunx nx run runtime-realization-type-env:vendor-boundaries
bunx nx run runtime-realization-type-env:mini-runtime
bunx nx run runtime-realization-type-env:simulate
bunx nx run runtime-realization-type-env:structural
bunx nx run runtime-realization-type-env:gate
```

## Iteration Rule

When the spec changes, update the smallest SDK facade, mini-runtime behavior, and fixture set needed to prove the new spine rule. Move the related proof manifest entry from `todo` or `xfail` to `proof`, `vendor-proof`, or `simulation-proof` only when its named gate is green.

If a change requires production code, split it into migration work. This tool may reveal a spec gap; it must not resolve architecture silently.

Use `evidence/focus-log.md` to record the current experiment and `evidence/vendor-fidelity.md` to keep vendor-shaped facades honest. Do not expand either into a parallel planning system.

## Guardrails

Agents working in this lab should start with `AGENTS.md` and `evidence/design-guardrails.md`. Those files define the lab structure, proof categories, violation categories, review categories, and test-theater rules used to keep evidence honest as the runtime spine evolves.
