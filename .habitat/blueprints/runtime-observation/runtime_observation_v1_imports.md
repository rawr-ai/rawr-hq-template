---
level: error
tags: [runtime, observation, ownership]
---
# Non-Authorizing Observation

Observation consumes the definition-owned port and a closed selected-topology
seed. It does not import runtime control owners, resource implementations, the
SDK composition root. Fixed read-model projection cannot acquire,
execute, mount, stop or replace product outcomes.

The blueprint acquires `src/**/*.ts`. Literal imports, reexports and first
dynamic import/require arguments are checked; comments and unrelated strings
are not import edges. Behavior and TypeScript prove the remaining contracts.

```grit
language js(typescript)

or {
  import_statement(source=$source),
  export_statement(source=$source) where { $source <: string() },
  `$callee($source, $...)` where {
    $callee <: r"^(?:import|require)$",
    $source <: string()
  }
} where {
  $source <: r"^[\"'](?:@habitat-ai/sdk(?:/[^\"']*)?|[^\"']*/(?:compiler|derivation|bootgraph|substrate|process-runtime|harnesses|mounting|resources|providers)(?:/[^\"']*)?)[\"']$"
}
```
