---
level: error
tags: [plugin, cli, ownership]
---
# CLI Topic Boundary

The topic index uses the public SDK factory. Topic implementation cannot import
application startup/profile selection, provider implementation subpaths, or
private runtime machinery. Public service/resource contracts, native Effect,
and import-safe host contracts are not prohibited.

Only literal module sources and first import/require arguments are examined;
comments, ordinary strings, and secondary options remain inert.

```grit
language js(typescript)

or {
  program(statements=$statements) where {
    $filename <: r"(?:^|.*/)src/index\.ts$",
    not {
      or {
        $statements <: contains `import { $..., defineCliTopicPlugin, $... } from "@habitat-ai/sdk/plugins/cli"` where { $factory = `defineCliTopicPlugin` },
        $statements <: contains `import { $..., defineCliTopicPlugin as $factory, $... } from "@habitat-ai/sdk/plugins/cli"`
      },
      $statements <: contains `$factory.factory($...)`
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
    $source <: r"^[\"'](?:@habitat-ai/sdk/(?:app|runtime/profiles)(?:/[^\"']*)?|[^\"']*/providers/[^\"']*|[^\"']*/runtime/(?:definition|derivation|compiler|bootgraph|substrate|process-runtime|mounting|observation)(?:/[^\"']*)?)[\"']$"
  }
}
```
