---
level: error
tags: [app, selection, entrypoint]
---
# App Selection Lineage

Selection files use the SDK's cold declaration builders. Thin role entrypoints
select existing app, profile, and process artifacts rather than importing
provider implementations. This checks parser-visible lineage, not runtime
identity agreement or a complete TypeScript dataflow proof.

```grit
language js(typescript)

or {
  program(statements=$statements) where {
    or {
      and { $filename <: r".*\.app\.ts$", $builder = `defineApp`, $module = `"@habitat-ai/sdk/app"` },
      and { $filename <: r".*/runtime/processes\.ts$", $builder = `defineProcessCatalog`, $module = `"@habitat-ai/sdk/app"` },
      and { $filename <: r".*/runtime/profiles/[^/]+\.ts$", $builder = `defineRuntimeProfile`, $module = `"@habitat-ai/sdk/runtime/profiles"` },
      and { $filename <: r".*/(?:cli|server|web|agent|desktop|async|dev)\.ts$", $builder = `defineEntrypoint`, $module = `"@habitat-ai/sdk/app"` }
    },
    not {
      or {
        $statements <: contains `import { $..., $builder, $... } from $module` where { $local = $builder },
        $statements <: contains `import { $..., $builder as $local, $... } from $module`
      },
      $statements <: contains `$local($...)`
    }
  },
  or {
    import_statement(source=$source),
    export_statement(source=$source) where { $source <: string() },
    `$callee($source, $...)` where {
      $callee <: r"^(?:import|require)$",
      $source <: string()
    }
  } where {
    $filename <: r".*/(?:cli|server|web|agent|desktop|async|dev)\.ts$",
    $source <: r"^[\"'][^\"']*/providers/[^\"']*[\"']$"
  }
}
```
