---
level: error
tags: [agent-plugin, command, boundary, import]
---
# Require Agent Plugin Command Channel Source Relationships

Curated agent-plugin commands remain independent of the native Oclif external
plugin lifecycle package. This law owns only literal parser-visible
module-loading edges under the curated command and command-support roots.
Package composition, computed sources, and other Oclif packages remain outside
this relation.

```grit
language js(typescript)

// Selects JavaScript and TypeScript source under the two curated command roots.
predicate require_agent_plugin_command_channel_source_relationships_is_curated_command_source() {
  or {
    $filename <: r"(?:^|.*/)apps/cli/src/commands/agent/plugins/.*\.[cm]?[jt]sx?$",
    $filename <: r"(?:^|.*/)apps/cli/src/lib/agent-plugins/commands/.*\.[cm]?[jt]sx?$"
  }
}

// Recognizes the native external-plugin package and its literal subpaths.
predicate require_agent_plugin_command_channel_source_relationships_is_native_plugin_source($source) {
  or {
    $source <: r"^[\"']@oclif/plugin-plugins(?:/[^\"']+)?[\"']$",
    and {
      $source <: template_string(),
      $source <: not contains template_substitution(),
      $source <: r"^`@oclif/plugin-plugins(?:/[^`]+)?`$"
    }
  }
}

or {
  import_statement(source=$source),
  export_statement(source=$source) where { $source <: string() },
  `import($source)`,
  `require($source)`,
  `require.resolve($source)`
} where {
  require_agent_plugin_command_channel_source_relationships_is_curated_command_source(),
  require_agent_plugin_command_channel_source_relationships_is_native_plugin_source(
    source=$source
  )
}
```

## Matches a static import in a curated command

```typescript
// @filename: apps/cli/src/commands/agent/plugins/status.ts
import Plugin from "@oclif/plugin-plugins";
```

## Matches a re-export in curated command support

```typescript
// @filename: apps/cli/src/lib/agent-plugins/commands/projection.ts
export { default as Plugins } from "@oclif/plugin-plugins/lib/commands/plugins";
```

## Matches a dynamic subpath import

```typescript
// @filename: apps/cli/src/commands/agent/plugins/status/vendors.ts
const installer = await import("@oclif/plugin-plugins/lib/commands/plugins/install");
```

## Matches a CommonJS require

```javascript
// @filename: apps/cli/src/lib/agent-plugins/commands/command.js
const Plugins = require("@oclif/plugin-plugins");
```

## Matches CommonJS resolution

```typescript
// @filename: apps/cli/src/commands/agent/plugins/check.ts
const pluginPath = require.resolve("@oclif/plugin-plugins");
```

## Matches a static template source

```typescript
// @filename: apps/cli/src/lib/agent-plugins/commands/binding.ts
const pluginPath = require.resolve(`@oclif/plugin-plugins/lib/index`);
```

## Ignores computed module sources

```typescript
// @filename: apps/cli/src/commands/agent/plugins/check.ts
const packageName = "@oclif/plugin-plugins";
const Plugins = await import(packageName);
```

## Ignores other Oclif packages

```typescript
// @filename: apps/cli/src/commands/agent/plugins/check.ts
import { Command } from "@oclif/core";
```

## Ignores source outside the curated command roots

```typescript
// @filename: apps/cli/src/commands/plugins/install.ts
import Plugin from "@oclif/plugin-plugins";
```

## Ignores package composition

```json
// @filename: apps/cli/package.json
{
  "oclif": {
    "plugins": ["@oclif/plugin-plugins"]
  }
}
```
