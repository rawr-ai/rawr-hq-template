---
level: error
tags: [runtime, harness, ownership]
---
# Native Harness Import Boundary

Harness contracts and native hosts consume bounded process access and lowered
payloads. They do not acquire providers or import SDK assembly, substrate,
mounting or observation owners. Native vendor integration stays in its owning
host. Definition, compiler and process-runtime contracts remain available;
this rule does not ban native Effect.
The exact relative `definition/src/observation` leaf is a permitted definition
contract, not the observation implementation owner.

The blueprint acquires `src/**/*.ts`, `elysia/**/*.ts`, `inngest/**/*.ts` and
`web/**/*.ts`. This parser-visible rule checks literal import sources and first
call arguments, not comments, ordinary strings or secondary option values.
Native behavior remains covered by the owner's tests and separately named acceptance.

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
  $source <: r"^[\"'](?:@habitat-ai/sdk(?:/[^\"']*)?|[^\"']*/(?:substrate|mounting|observation)(?:/[^\"']*)?|[^\"']*/providers/[^\"']*)[\"']$",
  not { $source <: r"^[\"'](?:\.\./)+definition/src/observation(?:\.(?:js|ts))?[\"']$" }
}
```
