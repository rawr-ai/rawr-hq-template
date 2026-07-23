---
level: error
---
# Require Oclif App Entrypoints

Production and development are direct Oclif entrypoints with no second
launcher, selector, or bootstrap layer.

```grit
language js(typescript)

or {
  program(statements=$body) where {
    $filename <: r".*apps/cli/bin/run\.js$",
    not {
      $body <: [
        `import { execute } from "@oclif/core"`,
        `await execute({ dir: import.meta.url })`
      ]
    }
  },
  program(statements=$body) where {
    $filename <: r".*apps/cli/src/index\.ts$",
    not {
      $body <: [
        `import { execute } from "@oclif/core"`,
        `await execute({ development: true, dir: import.meta.url })`
      ]
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
