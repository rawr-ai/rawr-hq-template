---
level: error
tags: [sdk, server, effect, orpc, bootstrap]
---
# Require SDK Server Effect Facade Source

The terminal SDK exposes one side-effect-only server Effect bootstrap. That
facade is exactly one bare static import of the official Effect-oRPC extension
plus an empty export, and owns no helper, runner, adapter, or alternate
execution path. The remaining server authoring face and the runtime plugin
definition must not load the vendor package, execute Effect directly, or
import `ManagedRuntime`. Erased named type imports from the native bridge root
are admitted for request context; they install no extension and own no runner.

Grit owns the authored source closure. TypeScript owns module augmentation and
the build owns emitted artifact assembly. Behavior proof owns the observable
transition from an unpatched native oRPC realm to the same realm with the
official `.effect(...)` extension installed.

```grit
language js(typescript)

// Restricts the relation to the task-4.2 authoring and definition sources.
predicate require_sdk_server_effect_facade_source_is_guarded_source() {
  or {
    $filename <: r"^(?:.*/)?packages/core/sdk/src/plugins/server/.*\.ts$",
    $filename <: r"^(?:.*/)?packages/core/runtime/definition/src/plugin\.ts$"
  }
}

// Names the one source file allowed to load the official extension.
predicate require_sdk_server_effect_facade_source_is_facade() {
  $filename <: r"^(?:.*/)?packages/core/sdk/src/plugins/server/effect/index\.ts$"
}

// Names only the public and adjacent source specifiers for that facade.
predicate require_sdk_server_effect_facade_source_is_facade_source($source) {
  $source <: r"^[\"'](?:@habitat-ai/sdk/plugins/server/effect|(?:\./|\.\./)+effect(?:/index)?)(?:\.[cm]?[jt]s)?[\"']$"
}

// Names every entrypoint of the vendor package hidden behind the facade.
predicate require_sdk_server_effect_facade_source_is_vendor_source($source) {
  $source <: r"^[\"']@orpc/experimental-effect(?:/[^\"']*)?[\"']$"
}

// Names the Effect root and ManagedRuntime submodule exactly.
predicate require_sdk_server_effect_facade_source_is_effect_root($source) {
  $source <: r"^[\"']effect[\"']$"
}

predicate require_sdk_server_effect_facade_source_is_managed_runtime_source($source) {
  $source <: r"^[\"']effect/ManagedRuntime[\"']$"
}

// Names Effect execution terminals owned by the official extension.
predicate require_sdk_server_effect_facade_source_terminal_name($runner) {
  $runner <: r"^(?:runFork|runForkWith|runCallback|runCallbackWith|runPromise|runPromiseWith|runPromiseExit|runPromiseExitWith|runSync|runSyncWith|runSyncExit|runSyncExitWith)$"
}

// Relates namespace use to the exact ManagedRuntime export.
predicate require_sdk_server_effect_facade_source_uses_managed_runtime($statements) {
  or {
    and {
      $statements <: contains `import { $..., ManagedRuntime, $... } from $source`,
      require_sdk_server_effect_facade_source_is_effect_root(source=$source)
    },
    and {
      $statements <: contains `import { $..., ManagedRuntime as $runtime, $... } from $source`,
      require_sdk_server_effect_facade_source_is_effect_root(source=$source)
    },
    and {
      $statements <: contains `import * as $effect from $source`,
      require_sdk_server_effect_facade_source_is_effect_root(source=$source),
      $statements <: contains `$effect.ManagedRuntime`
    }
  }
}

or {
  program() as $program where {
    require_sdk_server_effect_facade_source_is_facade(),
    not {
      $program <: `import "@orpc/experimental-effect/extensions/effect"; export {};`
    }
  },
  // Outside the facade, vendor loading is forbidden; erased root contract types are inert.
  or {
    import_statement(source=$source),
    export_statement(source=$source) where { $source <: string() },
    `import($source)`,
    `require($source)`
  } as $reach where {
    require_sdk_server_effect_facade_source_is_guarded_source(),
    not { require_sdk_server_effect_facade_source_is_facade() },
    require_sdk_server_effect_facade_source_is_vendor_source(source=$source),
    not { $reach <: `import type { $... } from "@orpc/experimental-effect"` }
  },
  // The cold authoring and definition faces must not load the bootstrap facade.
  or {
    import_statement(source=$source),
    export_statement(source=$source) where { $source <: string() },
    `import($source)`,
    `require($source)`
  } where {
    require_sdk_server_effect_facade_source_is_guarded_source(),
    not { require_sdk_server_effect_facade_source_is_facade() },
    require_sdk_server_effect_facade_source_is_facade_source(source=$source)
  },
  // ManagedRuntime belongs only to the process Effect substrate.
  or {
    import_statement(source=$source),
    export_statement(source=$source) where { $source <: string() },
    `import($source)`,
    `require($source)`
  } where {
    require_sdk_server_effect_facade_source_is_guarded_source(),
    require_sdk_server_effect_facade_source_is_managed_runtime_source(source=$source)
  },
  program(statements=$statements) where {
    require_sdk_server_effect_facade_source_is_guarded_source(),
    or {
      and {
        $statements <: contains `import { $..., Effect, $... } from $source`,
        $source <: r"^[\"']effect[\"']$",
        $statements <: contains `Effect.$runner`,
        require_sdk_server_effect_facade_source_terminal_name(runner=$runner)
      },
      and {
        $statements <: contains `import { $..., Effect as $effect, $... } from $source`,
        $source <: r"^[\"']effect[\"']$",
        $statements <: contains `$effect.$runner`,
        require_sdk_server_effect_facade_source_terminal_name(runner=$runner)
      },
      and {
        $statements <: contains `import * as $effect from $source`,
        $source <: r"^[\"']effect(?:/Effect)?[\"']$",
        $statements <: contains `$effect.$runner`,
        require_sdk_server_effect_facade_source_terminal_name(runner=$runner)
      },
      and {
        $statements <: contains `import * as $effect from $source`,
        $source <: r"^[\"']effect[\"']$",
        $statements <: contains `$effect.Effect.$runner`,
        require_sdk_server_effect_facade_source_terminal_name(runner=$runner)
      },
      and {
        $statements <: contains `import { $..., $runner, $... } from $source`,
        $source <: r"^[\"']effect(?:/Effect)?[\"']$",
        require_sdk_server_effect_facade_source_terminal_name(runner=$runner)
      },
      and {
        $statements <: contains `import { $..., $runner as $terminal, $... } from $source`,
        $source <: r"^[\"']effect(?:/Effect)?[\"']$",
        require_sdk_server_effect_facade_source_terminal_name(runner=$runner)
      },
      require_sdk_server_effect_facade_source_uses_managed_runtime(statements=$statements)
    }
  }
}
```

## Matches Extra Facade Behavior

```typescript
// @filename: packages/core/sdk/src/plugins/server/effect/index.ts
import "@orpc/experimental-effect/extensions/effect";
export const run = () => Effect.runPromise(program);
```

## Matches Direct Bridge Mechanics

```typescript
// @filename: packages/core/sdk/src/plugins/server/index.ts
import { handlerGen } from "@orpc/experimental-effect";
export const implementEffect = handlerGen;
```

## Ignores The Official Delegation

```typescript
// @filename: packages/core/sdk/src/plugins/server/effect/index.ts
import "@orpc/experimental-effect/extensions/effect";
export {};
```

## Ignores Erased Native Context Types

```typescript
// @filename: packages/core/runtime/definition/src/plugin.ts
import type { WithEffectContext } from "@orpc/experimental-effect";
export type ServerContext = WithEffectContext<never>;
```

## Matches A Value Import Masquerading As A Contract

```typescript
// @filename: packages/core/runtime/definition/src/plugin.ts
import { WithEffectContext } from "@orpc/experimental-effect";
```
