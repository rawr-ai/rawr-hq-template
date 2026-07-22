# Research SDK Router

## Scope

- Applies to `packages/research-sdk/**`.
- [Parent package router](../AGENTS.md)

## Boundaries

- `contracts` is Effect-neutral and is the only surface exported from the
  package root.
- `core` owns typed capabilities and pure adoption laws; it owns no storage,
  scheduler, controller, or study policy.
- `runtime` owns process-scoped resource composition and depends only on
  `contracts`, `core`, Effect, and Bun.
- Subject studies, fixtures, rubrics, evidence, and result interpretation stay
  in their owning research repositories.

## Flow

```text
contracts <- core <- runtime
```

## Routing

- Public data and schema changes: `src/contracts/`
- Capability and continuation-law changes: `src/core/`
- Process resource and command changes: `src/runtime/`
- Behavioral verification: `test/`

## Validation

- `bunx nx run @rawr/research-sdk:lint`
- `bunx nx run @rawr/research-sdk:typecheck`
- `bunx nx run @rawr/research-sdk:test`
- `bunx nx run @rawr/research-sdk:build`
- `bunx nx run @rawr/research-sdk:habitat`
