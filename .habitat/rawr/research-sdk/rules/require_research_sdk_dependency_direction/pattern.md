---
level: error
---
# Require Research SDK Dependency Direction

The public package root and contracts remain Effect-neutral. Contracts do not
depend on core or runtime, and core does not depend on runtime. Runtime may
depend inward on contracts and core. Git-owned artifact mechanics use admitted
Git plumbing and tool-neutral helpers rather than semantic Bun APIs.

```grit
language js(typescript)

or {
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
        $source <: r"^[\"']@rawr/research-sdk/(?:adapters|core|runtime)(?:/[^\"']*)?[\"']$",
        $source <: r"^[\"'](?:\.\.?/)+(?:adapters|core|runtime)(?:/[^\"']*)?[\"']$"
      }
    },
    and {
      $filename <: r".*packages/research-sdk/src/core/.*\.(?:[cm]?[jt]s|[jt]sx)$",
      or {
        $source <: r"^[\"']@rawr/research-sdk/(?:adapters|runtime)(?:/[^\"']*)?[\"']$",
        $source <: r"^[\"'](?:\.\.?/)+(?:adapters|runtime)(?:/[^\"']*)?[\"']$"
      }
    },
    and {
      $filename <: r".*packages/research-sdk/src/runtime/.*\.(?:[cm]?[jt]s|[jt]sx)$",
      or {
        $source <: r"^[\"']@rawr/research-sdk/adapters(?:/[^\"']*)?[\"']$",
        $source <: r"^[\"'](?:\.\.?/)+adapters(?:/[^\"']*)?[\"']$"
      }
    },
    and {
      $filename <: r".*packages/research-sdk/src/adapters/.*\.(?:[cm]?[jt]s|[jt]sx)$",
      not {
        $filename <: r".*packages/research-sdk/src/adapters/(?:codex-langfuse|codex-openshell)/.*\.(?:[cm]?[jt]s|[jt]sx)$"
      },
      or {
        $source <: r"^[\"']@rawr/research-sdk/adapters/[^\"']+[\"']$",
        and {
          $source <: r"^[\"'](?:\.\./[^\"']*|\.[^\"']*/\.\.(?:/[^\"']*)?)[\"']$",
          not {
            $source <: r"^[\"'](?:\.\./){2,}(?:contracts|core|runtime)(?:/[^\"']*)?[\"']$"
          }
        }
      }
    },
    and {
      $filename <: r".*packages/research-sdk/src/adapters/codex-langfuse/.*\.(?:[cm]?[jt]s|[jt]sx)$",
      or {
        $source <: r"^[\"']@rawr/research-sdk/adapters/[^\"']+[\"']$",
        and {
          $source <: r"^[\"'](?:\.\./[^\"']*|\.[^\"']*/\.\.(?:/[^\"']*)?)[\"']$",
          not {
            $source <: r"^[\"'](?:\.\./){2,}(?:contracts|core|runtime)(?:/[^\"']*)?[\"']$"
          }
        }
      },
      not {
        $source <: r"^[\"'](?:\.\./(?:codex|langfuse)|@rawr/research-sdk/adapters/(?:codex|langfuse))(?:/[^\"']*)?[\"']$"
      }
    },
    and {
      $filename <: r".*packages/research-sdk/src/adapters/codex-openshell/.*\.(?:[cm]?[jt]s|[jt]sx)$",
      or {
        $source <: r"^[\"']@rawr/research-sdk/adapters/[^\"']+[\"']$",
        and {
          $source <: r"^[\"'](?:\.\./[^\"']*|\.[^\"']*/\.\.(?:/[^\"']*)?)[\"']$",
          not {
            $source <: r"^[\"'](?:\.\./){2,}(?:contracts|core|runtime)(?:/[^\"']*)?[\"']$"
          }
        }
      },
      not {
        $source <: r"^[\"'](?:\.\./(?:codex|openshell)|@rawr/research-sdk/adapters/(?:codex|openshell))(?:/[^\"']*)?[\"']$"
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
      $source <: r"^[\"'](?:\.\.?/)*(?:[^./\"']|\.[^./\"']|\.\.[^/\"'])[^/\"']*(?:/[^\"']*)*/\.\.?(?:/[^\"']*)?[\"']$"
    },
    and {
      $filename <: r".*packages/research-sdk/src/.*\.(?:[cm]?[jt]s|[jt]sx)$",
      $source <: r"^[\"'][^\"']*(?:agent-plugin-lifecycle|controller-release)[^\"']*[\"']$"
    },
    and {
      $filename <: r".*packages/research-sdk/src/adapters/git-bun/git(?:-adapter|-repository|-patch)?\.(?:[cm]?[jt]s|[jt]sx)$",
      $source <: r"^[\"']bun(?:(?:/|:)[^\"']*)?[\"']$"
    }
  }
},
  `Bun` where {
    $filename <: r".*packages/research-sdk/src/adapters/git-bun/git(?:-adapter|-repository|-patch)?\.(?:[cm]?[jt]s|[jt]sx)$"
  }
}
```
