---
level: error
tags: [service, effect, orpc, bootstrap, terminal]
---
# Require Service Effect Bridge

An Effect-backed service operation loads the official oRPC extension through
one bare static side-effect import of the Habitat SDK facade. The structurally
singular service implementation is the sole production role that may load that
facade; a native-handler-only service omits it. Service production never
reaches through the SDK to the vendor package, adapts a handler with
`handlerGen`, imports `ManagedRuntime`, or calls a manual Effect terminal.

This law follows imported Effect bindings in one source file. Grit owns
bootstrap form, per-file cardinality, and confinement rather than cross-file
topology. TypeScript owns extension availability and module lineage; behavior
proof owns request-fiber bootstrap, ordering, and module-realm execution.

```grit
language js(typescript)

// Restricts bridge placement and terminal provenance to service production source.
predicate service_v3_effect_bridge_is_production_source() {
  $filename <: r"^(?:.*/)?src/(?:client|service/.*)\.ts$"
}

// Recognizes the sole service role allowed to install the Effect extension.
predicate service_v3_effect_bridge_is_implementation_source() {
  $filename <: r"^(?:.*/)?src/service/impl\.ts$"
}

// Recognizes Habitat's sole public bootstrap for the official extension.
predicate service_v3_effect_bridge_is_facade_source($source) {
  $source <: r"^[\"']@habitat-ai/sdk/plugins/server/effect[\"']$"
}

// Recognizes every entrypoint of the vendor package hidden by the SDK facade.
predicate service_v3_effect_bridge_is_vendor_source($source) {
  $source <: r"^[\"']@orpc/experimental-effect(?:/[^\"']*)?[\"']$"
}

// Names the Effect root and ManagedRuntime submodule exactly.
predicate service_v3_effect_bridge_is_effect_root($source) {
  $source <: r"^[\"']effect[\"']$"
}

predicate service_v3_effect_bridge_is_managed_runtime_source($source) {
  $source <: r"^[\"']effect/ManagedRuntime[\"']$"
}

// Names Effect execution terminals owned by the official oRPC bridge.
predicate service_v3_effect_bridge_terminal_name($runner) {
  $runner <: r"^(?:runFork|runForkWith|runCallback|runCallbackWith|runPromise|runPromiseWith|runPromiseExit|runPromiseExitWith|runSync|runSyncWith|runSyncExit|runSyncExitWith)$"
}

// Relates a terminal reference to its exact imported Effect namespace owner.
predicate service_v3_effect_bridge_uses_terminal($statements, $owner, $runner) {
  $statements <: contains `$owner.$runner` where {
    service_v3_effect_bridge_terminal_name(runner=$runner)
  }
}

// Relates root-module imports to the exact ManagedRuntime export.
predicate service_v3_effect_bridge_uses_managed_runtime($statements) {
  or {
    and {
      $statements <: contains `import { $..., ManagedRuntime, $... } from $source`,
      service_v3_effect_bridge_is_effect_root(source=$source)
    },
    and {
      $statements <: contains `import { $..., ManagedRuntime as $runtime, $... } from $source`,
      service_v3_effect_bridge_is_effect_root(source=$source)
    },
    and {
      $statements <: contains `import * as $effect from $source`,
      service_v3_effect_bridge_is_effect_root(source=$source),
      $statements <: contains `$effect.ManagedRuntime`
    }
  }
}

or {
  // No service production source may reach the vendor package directly.
  or {
    import_statement(source=$source),
    export_statement(source=$source) where { $source <: string() },
    `import($source)`,
    `require($source)`
  } where {
    service_v3_effect_bridge_is_production_source(),
    service_v3_effect_bridge_is_vendor_source(source=$source)
  },
  // ManagedRuntime belongs only to the process Effect substrate.
  or {
    import_statement(source=$source),
    export_statement(source=$source) where { $source <: string() },
    `import($source)`,
    `require($source)`
  } where {
    service_v3_effect_bridge_is_production_source(),
    service_v3_effect_bridge_is_managed_runtime_source(source=$source)
  },
  // The SDK facade is admitted only as a bare static import in impl.ts.
  import_statement(source=$source) as $import where {
    service_v3_effect_bridge_is_production_source(),
    service_v3_effect_bridge_is_facade_source(source=$source),
    or {
      not { service_v3_effect_bridge_is_implementation_source() },
      $import <: contains import_clause(),
      $import <: contains import_attribute()
    }
  },
  // Re-exports and runtime loaders cannot install the facade, even in impl.ts.
  or {
    export_statement(source=$source) where { $source <: string() },
    `import($source)`,
    `require($source)`
  } where {
    service_v3_effect_bridge_is_production_source(),
    service_v3_effect_bridge_is_facade_source(source=$source)
  },
  // The singular implementation may contain at most one facade import.
  program(statements=$statements) where {
    service_v3_effect_bridge_is_implementation_source(),
    $statements <: [
      $...,
      import_statement(source=$first),
      $...,
      import_statement(source=$second),
      $...
    ],
    service_v3_effect_bridge_is_facade_source(source=$first),
    service_v3_effect_bridge_is_facade_source(source=$second)
  },
  program(statements=$statements) where {
    service_v3_effect_bridge_is_production_source(),
    or {
      and {
        $statements <: contains `import { $..., Effect, $... } from $source`,
        $source <: r"^[\"']effect[\"']$",
        service_v3_effect_bridge_uses_terminal(
          statements=$statements,
          owner=`Effect`,
          runner=$runner
        )
      },
      and {
        $statements <: contains `import { $..., Effect as $effect, $... } from $source`,
        $source <: r"^[\"']effect[\"']$",
        service_v3_effect_bridge_uses_terminal(
          statements=$statements,
          owner=$effect,
          runner=$runner
        )
      },
      and {
        $statements <: contains `import * as $effect from $source`,
        $source <: r"^[\"']effect/Effect[\"']$",
        service_v3_effect_bridge_uses_terminal(
          statements=$statements,
          owner=$effect,
          runner=$runner
        )
      },
      and {
        $statements <: contains `import * as $effect from $source`,
        $source <: r"^[\"']effect[\"']$",
        service_v3_effect_bridge_uses_terminal(
          statements=$statements,
          owner=`$effect.Effect`,
          runner=$runner
        )
      },
      and {
        $statements <: contains `import { $..., $runner, $... } from $source`,
        $source <: r"^[\"']effect(?:/Effect)?[\"']$",
        service_v3_effect_bridge_terminal_name(runner=$runner)
      },
      and {
        $statements <: contains `import { $..., $runner as $terminal, $... } from $source`,
        $source <: r"^[\"']effect(?:/Effect)?[\"']$",
        service_v3_effect_bridge_terminal_name(runner=$runner)
      },
      service_v3_effect_bridge_uses_managed_runtime(statements=$statements)
    }
  }
}
```

## Matches facade loading outside the implementation

```typescript
// @filename: src/service/base.ts
import "@habitat-ai/sdk/plugins/server/effect";
```

## Matches direct vendor loading in the implementation

```typescript
// @filename: src/service/impl.ts
import "@orpc/experimental-effect/extensions/effect";
```

## Matches direct handler adaptation

```typescript
// @filename: src/service/modules/records/router/read.ts
import { handlerGen } from "@orpc/experimental-effect";
export const read = module.read.handler(handlerGen(function* () {
  return "ready";
}));
```

## Matches a manual Effect terminal

```typescript
// @filename: src/service/modules/records/router/read.ts
import { Effect } from "effect";
export const read = module.read.handler(() => Effect.runPromise(program));
```

## Ignores the official bootstrap and Effect handler

```typescript
// @filename: src/service/impl.ts
import "@habitat-ai/sdk/plugins/server/effect";

// @filename: src/service/modules/records/router/read.ts
export const read = module.read.effect(function* ({ context }) {
  return yield* context.inventory;
});
```

## Ignores unrelated runner APIs

```typescript
// @filename: src/service/modules/records/router/read.ts
import { taskRunner } from "@example/task-runner";
export const read = () => taskRunner.runPromise(program);
```
