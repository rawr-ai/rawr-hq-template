---
level: error
tags: [runtime, harness, ownership]
---
# Generic Harness Import Boundary

Generic harness contracts consume bounded process access and already-lowered
payloads. They do not acquire providers or import SDK assembly, substrate,
mounting, or observation owners. Definition, compiler, and process-runtime
contracts remain available; this rule does not ban raw Effect.

The blueprint acquires only `src/**/*.ts`. This parser-visible rule checks
literal import sources and first call arguments, not comments, ordinary strings,
or secondary option values. Runtime behavior remains covered by owner tests.

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
  $source <: r"^[\"'](?:@habitat-ai/sdk(?:/[^\"']*)?|[^\"']*/(?:substrate|mounting|observation)(?:/[^\"']*)?|[^\"']*/providers/[^\"']*)[\"']$"
}
```
