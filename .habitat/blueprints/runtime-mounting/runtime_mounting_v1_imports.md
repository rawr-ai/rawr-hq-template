---
level: error
tags: [runtime, mounting, ownership]
---
# Mounting Import Boundary

Mounting consumes an exact process-owned handoff and native harness contracts.
The SDK performs upstream realization and supplies the definition-owned
observation port; neither producer internals nor read-model implementation are
mounting authority. The source rule does not prohibit Effect data imports.

The blueprint acquires only `src/**/*.ts`. Match literal import/re-export
sources and the first argument of native import/require calls, not comments,
ordinary strings, or secondary options. Behavioral tests prove lifecycle law.

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
  $source <: r"^[\"'](?:@habitat-ai/sdk(?:/[^\"']*)?|[^\"']*/(?:compiler|derivation|bootgraph|substrate|observation)(?:/[^\"']*)?|[^\"']*/(?:providers|resources)/[^\"']*)[\"']$"
}
```
