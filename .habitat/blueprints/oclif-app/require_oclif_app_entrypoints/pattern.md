---
level: error
---
# Require Oclif App Entrypoints

Production and development are direct Oclif entrypoints with no second
launcher, selector, or bootstrap layer.

```grit
language js(typescript)

predicate is_production_entrypoint_statement($statement) {
  or {
    $statement <: `import { execute } from "@oclif/core";`,
    $statement <: `await execute({ dir: import.meta.url });`
  }
}

predicate is_development_entrypoint_statement($statement) {
  or {
    $statement <: `import { execute } from "@oclif/core";`,
    $statement <: `await execute({ development: true, dir: import.meta.url });`
  }
}

or {
  program(statements=$statements) as $program where {
    $filename <: r".*apps/cli/bin/run\.js$",
    or {
      not {
        $program <: contains `import { execute } from "@oclif/core"`,
        $program <: contains `await execute({ dir: import.meta.url })`
      },
      $statements <: some $statement where {
        not { is_production_entrypoint_statement(statement=$statement) }
      }
    }
  },
  program(statements=$statements) as $program where {
    $filename <: r".*apps/cli/src/index\.ts$",
    or {
      not {
        $program <: contains `import { execute } from "@oclif/core"`,
        $program <: contains `await execute({ development: true, dir: import.meta.url })`
      },
      $statements <: some $statement where {
        not { is_development_entrypoint_statement(statement=$statement) }
      }
    }
  }
}
```

## Matches a delegated production entrypoint

```typescript
// @filename: apps/cli/bin/run.js
import { runController } from "../dist/controller.js";

await runController();
```

## Matches a non-development source entrypoint

```typescript
// @filename: apps/cli/src/index.ts
import { execute } from "@oclif/core";

await execute({ dir: import.meta.url });
```

## Matches a production entrypoint with extra bootstrap work

```typescript
// @filename: apps/cli/bin/run.js
import { execute } from "@oclif/core";

await bootstrap();
await execute({ dir: import.meta.url });
```

## Matches a development entrypoint with extra bootstrap work

```typescript
// @filename: apps/cli/src/index.ts
import { execute } from "@oclif/core";

await bootstrap();
await execute({ development: true, dir: import.meta.url });
```

## Ignores direct Oclif entrypoints

```typescript
// @filename: apps/cli/bin/run.js
import { execute } from "@oclif/core";

await execute({ dir: import.meta.url });

// @filename: apps/cli/src/index.ts
import { execute } from "@oclif/core";

await execute({ development: true, dir: import.meta.url });
```

```typescript
// @filename: apps/cli/bin/run.js
import { execute } from "@oclif/core";

await execute({ dir: import.meta.url });

// @filename: apps/cli/src/index.ts
import { execute } from "@oclif/core";

await execute({ development: true, dir: import.meta.url });
```
