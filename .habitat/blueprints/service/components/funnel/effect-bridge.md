---
level: error
tags: [service, effect, orpc, bootstrap, terminal]
---
# Require Service Effect Bridge

An Effect-backed service operation uses the official oRPC extension. The
structurally singular service implementation is the sole production role that
may load it; a native-handler-only service omits it. The bridge owns Effect
execution, so service production does not acquire or call a manual Effect
terminal.

This law follows imported Effect bindings in one source file. Grit owns
bootstrap confinement rather than cross-file cardinality. TypeScript owns
extension availability and module lineage; behavior proof owns request-fiber
bootstrap, ordering, and module-realm execution.

```grit
language js(typescript)

// Restricts bridge placement and terminal provenance to service production source.
predicate service_v1_effect_bridge_is_production_source() {
  $filename <: r"(?:^|.*/)src/(?:client|service/.*)\.ts$"
}

// Recognizes the sole service role allowed to install the Effect extension.
predicate service_v1_effect_bridge_is_implementation_source() {
  $filename <: r"(?:^|.*/)src/service/impl\.ts$"
}

// Recognizes the exact official oRPC Effect extension module source.
predicate service_v1_effect_bridge_is_extension_source($source) {
  $source <: r"^[\"']@orpc/experimental-effect/extensions/effect[\"']$"
}

// Names Effect execution terminals owned by the official oRPC bridge.
predicate service_v1_effect_bridge_terminal_name($runner) {
  $runner <: r"^(?:runPromise|runPromiseExit|runSync|runSyncExit|runFork|runCallback)$"
}

// Relates a terminal reference to its exact imported Effect namespace owner.
predicate service_v1_effect_bridge_uses_terminal($statements, $owner, $runner) {
  $statements <: contains `$owner.$runner` where {
    service_v1_effect_bridge_terminal_name(runner=$runner)
  }
}

or {
  or {
    import_statement(source=$source),
    export_statement(source=$source) where { $source <: string() },
    `import($source)`,
    `require($source)`
  } where {
    service_v1_effect_bridge_is_production_source(),
    service_v1_effect_bridge_is_extension_source(source=$source),
    not { service_v1_effect_bridge_is_implementation_source() }
  },
  program(statements=$statements) where {
    service_v1_effect_bridge_is_production_source(),
    or {
      and {
        $statements <: contains `import { $..., Effect, $... } from $source`,
        $source <: r"^[\"']effect[\"']$",
        service_v1_effect_bridge_uses_terminal(
          statements=$statements,
          owner=`Effect`,
          runner=$runner
        )
      },
      and {
        $statements <: contains `import { $..., Effect as $effect, $... } from $source`,
        $source <: r"^[\"']effect[\"']$",
        service_v1_effect_bridge_uses_terminal(
          statements=$statements,
          owner=$effect,
          runner=$runner
        )
      },
      and {
        $statements <: contains `import * as $effect from $source`,
        $source <: r"^[\"']effect/Effect[\"']$",
        service_v1_effect_bridge_uses_terminal(
          statements=$statements,
          owner=$effect,
          runner=$runner
        )
      },
      and {
        $statements <: contains `import * as $effect from $source`,
        $source <: r"^[\"']effect[\"']$",
        service_v1_effect_bridge_uses_terminal(
          statements=$statements,
          owner=`$effect.Effect`,
          runner=$runner
        )
      },
      and {
        $statements <: contains `import { $..., $runner, $... } from $source`,
        $source <: r"^[\"'](?:effect(?:/Effect)?|@orpc/experimental-effect)[\"']$",
        service_v1_effect_bridge_terminal_name(runner=$runner)
      },
      and {
        $statements <: contains `import { $..., $runner as $terminal, $... } from $source`,
        $source <: r"^[\"'](?:effect(?:/Effect)?|@orpc/experimental-effect)[\"']$",
        service_v1_effect_bridge_terminal_name(runner=$runner)
      }
    }
  }
}
```

## Matches extension loading outside the implementation

```typescript
// @filename: src/service/base.ts
import "@orpc/experimental-effect/extensions/effect";
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
import "@orpc/experimental-effect/extensions/effect";

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
