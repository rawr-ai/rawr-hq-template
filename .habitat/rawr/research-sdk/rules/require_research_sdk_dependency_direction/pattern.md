---
level: error
---
# Require Research SDK Dependency Direction

The public package root and contracts remain Effect-neutral. Contracts do not
depend on core or runtime, and core does not depend on runtime. Runtime may
depend inward on contracts and core.

```grit
language js(typescript)

or {
  import_statement(source=$source),
  export_statement(source=$source),
  `import($source)`,
  `require($source)`
} where {
  or {
    and {
      $filename <: r".*packages/research-sdk/src/(?:index|contracts/.*)\.(?:[cm]?[jt]s|[jt]sx)$",
      or {
        $source <: r"^[\"'](?:effect(?:/[^\"']*)?|@effect/[^\"']+)[\"']$",
        $source <: r"^[\"']@rawr/research-sdk/(?:core|runtime)(?:/[^\"']*)?[\"']$",
        $source <: r"^[\"'](?:\.\.?/)+(?:core|runtime)(?:/[^\"']*)?[\"']$"
      }
    },
    and {
      $filename <: r".*packages/research-sdk/src/core/.*\.(?:[cm]?[jt]s|[jt]sx)$",
      or {
        $source <: r"^[\"']@rawr/research-sdk/runtime(?:/[^\"']*)?[\"']$",
        $source <: r"^[\"'](?:\.\.?/)+runtime(?:/[^\"']*)?[\"']$"
      }
    },
    and {
      $filename <: r".*packages/research-sdk/src/.*\.(?:[cm]?[jt]s|[jt]sx)$",
      $source <: r"^[\"']@rawr/[^\"']+[\"']$",
      not {
        $source <: r"^[\"']@rawr/research-sdk(?:/[^\"']*)?[\"']$"
      }
    },
    and {
      $filename <: r".*packages/research-sdk/src/index\.(?:[cm]?[jt]s|[jt]sx)$",
      $source <: r"^[\"']\.\./"
    },
    and {
      $filename <: r".*packages/research-sdk/src/(?:contracts|core|runtime)/.*\.(?:[cm]?[jt]s|[jt]sx)$",
      $source <: r"^[\"'](?:\.\./){2,}"
    },
    and {
      $filename <: r".*packages/research-sdk/src/.*\.(?:[cm]?[jt]s|[jt]sx)$",
      $source <: r"^[\"'][^\"']*(?:agent-plugin-lifecycle|controller-release)[^\"']*[\"']$"
    }
  }
}
```
