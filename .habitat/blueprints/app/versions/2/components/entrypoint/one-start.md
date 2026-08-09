---
level: error
tags: [app, entrypoint, process, runtime]
---
# Require One App Start

Every root TypeScript entrypoint selects one cold process record through exactly
one top-level `startApp(...)` call. Composition, provider selection, native
mounting, process loops, and sibling-process coordination stay with their
existing owners.

```grit
language typescript

program(statements=$statements) where {
  not { $filename <: r"\.app\.ts$" },
  $calls = [],
  $statements <: some bubble($calls) $statement where {
    $statement <: contains $call where {
      $call <: `startApp($_)`
    },
    $calls += $call
  },
  $call_count = length(target=$calls),
  ! $call_count <: 1
}
```

## Matches

```ts
await startApp(app, { profile, process: processes.server });
await startApp(app, { profile, process: processes.async });
```

## Ignores

```ts
await startApp(app, { profile, process: processes.server });
```
