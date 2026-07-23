---
level: error
---
# Require Oclif Command Source Relationships

Command files expose the default export Oclif discovers. Command plugins do not
depend on one another and do not reach into another package's mechanical
source, output, test, or implementation directory. Package export maps,
TypeScript, and Nx own which remaining dependency subpaths are public.
Oclif manifest generation and owner behavior tests validate the exported value;
this source rule only requires the default-export surface.

```grit
language js(typescript)

or {
  program() as $program where {
    $filename <: r".*plugins/cli/commands/[^/]+/src/commands/.*\.ts$",
    not {
      $program <: contains or {
        `export default class $name extends $base { $... }`,
        `export default $name`
      }
    }
  },
  import_statement(source=$source) where {
    $filename <: r".*plugins/cli/commands/[^/]+/src/.*\.ts$",
    or {
      $source <: r"^[\"']@rawr/[^\"']+/(?:src|dist|test|internal)(?:/|[\"'])",
      $source <: r"^[\"']@rawr/plugin-[^/\"']+(?:/|[\"'])"
    }
  },
  `export { $exports } from $source` where {
    $filename <: r".*plugins/cli/commands/[^/]+/src/.*\.ts$",
    or {
      $source <: r"^[\"']@rawr/[^\"']+/(?:src|dist|test|internal)(?:/|[\"'])",
      $source <: r"^[\"']@rawr/plugin-[^/\"']+(?:/|[\"'])"
    }
  },
  `export * from $source` where {
    $filename <: r".*plugins/cli/commands/[^/]+/src/.*\.ts$",
    or {
      $source <: r"^[\"']@rawr/[^\"']+/(?:src|dist|test|internal)(?:/|[\"'])",
      $source <: r"^[\"']@rawr/plugin-[^/\"']+(?:/|[\"'])"
    }
  },
  `import($source)` where {
    $filename <: r".*plugins/cli/commands/[^/]+/src/.*\.ts$",
    or {
      $source <: r"^[\"']@rawr/[^\"']+/(?:src|dist|test|internal)(?:/|[\"'])",
      $source <: r"^[\"']@rawr/plugin-[^/\"']+(?:/|[\"'])"
    }
  }
}
```

## Matches a command without a default export

```typescript
// @filename: plugins/cli/commands/example/src/commands/show.ts
export class ShowCommand extends Command {}
```

## Matches a mechanical package import

```typescript
// @filename: plugins/cli/commands/example/src/commands/show.ts
import { client } from "@rawr/other/src/client";

export default class ShowCommand extends Command {}
```

## Matches a cross-plugin dependency

```typescript
// @filename: plugins/cli/commands/example/src/commands/show.ts
import OtherCommand from "@rawr/plugin-other";

export default class ShowCommand extends Command {}
```

## Ignores a command on public dependency boundaries

```typescript
// @filename: plugins/cli/commands/example/src/commands/show.ts
import { Command } from "@oclif/core";
import { client } from "@rawr/other/client";

export default class ShowCommand extends Command {}
```

```typescript
// @filename: plugins/cli/commands/example/src/commands/show.ts
import { Command } from "@oclif/core";
import { client } from "@rawr/other/client";

export default class ShowCommand extends Command {}
```

## Ignores a separately declared default command class

```typescript
// @filename: plugins/cli/commands/example/src/commands/show.ts
import { Command } from "@oclif/core";
import { helper } from "../lib/helper";

class ShowCommand extends Command {}

export default ShowCommand;
```

```typescript
// @filename: plugins/cli/commands/example/src/commands/show.ts
import { Command } from "@oclif/core";
import { helper } from "../lib/helper";

class ShowCommand extends Command {}

export default ShowCommand;
```
