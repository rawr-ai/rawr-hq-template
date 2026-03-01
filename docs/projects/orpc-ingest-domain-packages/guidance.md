# Guidance

## What This Document Is

- `guidance.md` is operational implementation guidance.
- It captures current defaults and conventions for building/maintaining domain example packages.
- Hard architectural locks belong in `DECISIONS.md`.
- Example progression (invariants + axes) belongs in `examples.md`.

## Package Shape (Always-On)

Use one stable top-level structure across package sizes:

- `src/index.ts` for public package entry,
- `src/boundary/` for boundary scaffolding,
- `src/modules/` for capability modules and router composition.

## Module Shape: `contract.ts` + `router.ts`

Each module should split boundary definition from behavior:

- `contract.ts`: procedure names, input/output schemas, `.errors(...)` declarations.
- `router.ts`: handler implementation only (`implement(contract)`), context wiring, orchestration logic.

Rules:

- Do not duplicate contract shape in `router.ts`.
- Do not place business orchestration in module `contract.ts`.
- Keep module `router.ts` readable as execution logic, not as schema-definition boilerplate.
- Keep module `contract.ts` fully inline for procedure definitions (`.input(...)`, `.output(...)`, `.errors(...)`) in the same chain.
- In procedure chains, place `.errors(...)` after `.input(...)` and `.output(...)` for consistent scan order.
- Prefer TypeBox `description` metadata on schema objects/properties for semantic documentation; avoid extra schema-only JSDoc noise.

## Boundary Error Standard

### Caller Contract

- ORPC procedure `.errors(...)` declarations are the canonical caller contract.
- Procedures throw only caller-actionable boundary errors.

### Inside Boundary

- Expected business states should be values (`null`, `exists`, result objects).
- Procedure handlers decide when those states become caller-actionable errors.

### Internal Failures

- Unexpected internals should not be part of typed boundary error contracts by default.
- Default posture: allow unexpected internals to bubble; rely on logging/tracing for diagnosis.

### On Mapping Layers

- No standing domain-catalog/unwrap translation layer in active examples.
- Inline conversion at the procedure boundary is the intended pattern.

## neverthrow Guidance

Neverthrow is available, but not an always-on repository API contract.

Use it where it adds leverage:

- multi-step composition and recovery,
- internal pipelines where `Result` flow improves clarity.

Avoid forcing neverthrow where simple `Promise<T>` is clearer.

Boundary rule still applies either way: procedures expose ORPC boundary errors, not internal mechanics.

## Error Definition Placement

Use sharing-based placement:

- `boundary/procedure-errors.ts` for reusable cross-module boundary error definitions,
- module-specific boundary errors inline in `modules/<name>/contract.ts`,
- procedure-local errors only when truly local to one procedure.

Each procedure still declares only the errors it can throw.

## `UnexpectedInternalError` Usage

Use `UnexpectedInternalError` only when local code detects an invariant violation you want to classify in telemetry.

Do not use it as a default replacement for ordinary thrown internals.

If you do not need invariant classification, plain internal throws are sufficient.
