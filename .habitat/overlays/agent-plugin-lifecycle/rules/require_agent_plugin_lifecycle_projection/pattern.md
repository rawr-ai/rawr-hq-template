---
level: error
tags: [plugin, cli, lifecycle, ownership]
---
# Agent Plugin Lifecycle Public Projection

Each command has its retained native ID and no aliases. The shared service
use stays in `services.ts` and references the public lifecycle export. Other
helpers may import public request types, bounds and scalar parsers. Domain
validation, procedure behavior and one-call cardinality remain typed behavior
tests, not a duplicate lifecycle implementation in policy.

Only literal acquisition sources and native SDK constructor relationships
have authority here. Comments, ordinary strings, unrelated property names and
secondary import options are not imports.

```grit
language js(typescript)

// Bounds this overlay to the exact topic's production source.
predicate require_agent_plugin_lifecycle_projection_is_source() {
  $filename <: r"^(?:.*/)?plugins/cli/topics/agent-plugins/src/.*\.ts$"
}

// Associates each closed command owner with its exact native ID.
predicate require_agent_plugin_lifecycle_projection_command_id($id) {
  or {
    and { $filename <: r".*/src/commands/check\.ts$", $id = `"agent:plugins:check"` },
    and { $filename <: r".*/src/commands/package\.ts$", $id = `"agent:plugins:package"` },
    and { $filename <: r".*/src/commands/status\.ts$", $id = `"agent:plugins:status"` },
    and { $filename <: r".*/src/commands/sync\.ts$", $id = `"agent:plugins:sync"` },
    and { $filename <: r".*/src/commands/test\.ts$", $id = `"agent:plugins:test"` },
    and { $filename <: r".*/src/commands/vendors/update\.ts$", $id = `"agent:plugins:vendors:update"` }
  }
}

// Resolves direct and aliased imports of the qualified native command constructor.
predicate require_agent_plugin_lifecycle_projection_native_builder($statements, $builder) {
  or {
    and {
      $statements <: contains `import { $..., createOclifCommand, $... } from "@habitat-ai/sdk/plugins/cli/oclif"`,
      $builder = `createOclifCommand`
    },
    $statements <: contains `import { $..., createOclifCommand as $builder, $... } from "@habitat-ai/sdk/plugins/cli/oclif"`
  }
}

or {
  program(statements=$statements) where {
    require_agent_plugin_lifecycle_projection_is_source(),
    require_agent_plugin_lifecycle_projection_command_id(id=$id),
    not {
      require_agent_plugin_lifecycle_projection_native_builder(statements=$statements, builder=$builder),
      $statements <: contains `$builder({ $..., id: $id, $... })`
    }
  },
  program(statements=$statements) where {
    require_agent_plugin_lifecycle_projection_is_source(),
    require_agent_plugin_lifecycle_projection_native_builder(statements=$statements, builder=$builder),
    or {
      $statements <: contains `$builder({ $..., aliases: $aliases, $... })`,
      $statements <: contains `$builder({ $..., hiddenAliases: $aliases, $... })`
    },
    not { $aliases <: `[]` }
  },
  program(statements=$statements) where {
    $filename <: r"^(?:.*/)?plugins/cli/topics/agent-plugins/src/services\.ts$",
    not {
      or {
        and {
          $statements <: contains `import { $..., serviceRuntimeExport, $... } from "@habitat-ai/agent-plugin-lifecycle-service/client"`,
          $service = `serviceRuntimeExport`
        },
        $statements <: contains `import { $..., serviceRuntimeExport as $service, $... } from "@habitat-ai/agent-plugin-lifecycle-service/client"`
      },
      or {
        and {
          $statements <: contains `import { $..., useService, $... } from "@habitat-ai/sdk/plugins/cli"`,
          $use = `useService`
        },
        $statements <: contains `import { $..., useService as $use, $... } from "@habitat-ai/sdk/plugins/cli"`
      },
      $statements <: contains `{ lifecycle: $use($service) }`
    }
  },
  or {
    import_statement(source=$source),
    export_statement(source=$source) where { $source <: string() },
    `$callee($source, $...)` where { $callee <: r"^(?:import|require)$", $source <: string() }
  } where {
    require_agent_plugin_lifecycle_projection_is_source(),
    or {
      and {
        $source <: r"^[\"']@habitat-ai/agent-plugin-lifecycle-service(?:/[^\"']*)?[\"']$",
        not { $source <: r"^[\"']@habitat-ai/agent-plugin-lifecycle-service/client[\"']$" }
      },
      $source <: r"^[\"'][^\"']*/services/agent-plugin-lifecycle/[^\"']*[\"']$"
    }
  },
  program(statements=$statements) where {
    require_agent_plugin_lifecycle_projection_is_source(),
    or {
      $statements <: contains `import { $..., createClient, $... } from "@habitat-ai/agent-plugin-lifecycle-service/client"`,
      $statements <: contains `import { $..., createClient as $client, $... } from "@habitat-ai/agent-plugin-lifecycle-service/client"`,
      and {
        $statements <: contains `import * as $lifecycle from "@habitat-ai/agent-plugin-lifecycle-service/client"`,
        $statements <: contains `$lifecycle.createClient`
      },
      and {
        not { $filename <: r".*/src/services\.ts$" },
        or {
          $statements <: contains `import { $..., useService, $... } from "@habitat-ai/sdk/plugins/cli"`,
          $statements <: contains `import { $..., useService as $use, $... } from "@habitat-ai/sdk/plugins/cli"`
        }
      }
    }
  }
}
```
