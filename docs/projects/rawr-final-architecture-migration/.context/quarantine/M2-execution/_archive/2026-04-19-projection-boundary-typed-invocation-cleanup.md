# Projection Boundary Typed Invocation Cleanup

Date: 2026-04-19

## Branch

- Parent: `agent-service-module-ownership-hardening`
- Current: `agent-projection-typed-invocation-cleanup`

## Prior Crew Closure

- The service module-ownership hardening pass was already integrated and clean at branch tip `bd6108d6`.
- No live prior worker handles were available in the compacted context to close from this thread.
- Current branch proof before this slice: `git status --short --branch` was clean and `gt ls --no-interactive` showed `agent-service-module-ownership-hardening` as the stack tip.

## Objective

Remove projection-local invocation helper drift and weak service-client casts while preserving the canonical oRPC service-package boundary:

- service clients receive construction-time `{ deps, scope, config }`
- each procedure call receives typed `{ context: { invocation } }`
- services own behavior and query policy
- projections instantiate concrete resources only as transitional binding inputs for future runtime `bind(...)` / `bindService(...)`

## Design Notes

- `defineServicePackage(router)` already exposes per-procedure call option types, so generic `createServiceInvocationOptions(traceId)` is not necessary for service projections.
- Projection adapters should use call options checked with `satisfies Parameters<Client["module"]["procedure"]>[1]`.
- SDK-internal API/workflow trace forwarding can keep `createInternalTraceForwardingOptions`; service-package invocation helper export should not be the public pattern.

## Verification Targets

- focused typecheck/test/structural for `@rawr/hq-sdk`, `@rawr/plugin-plugins`, `@rawr/plugin-chatgpt-corpus`, `@rawr/plugin-session-tools`, `@rawr/server`
- `@rawr/agent-config-sync:structural`
- `@rawr/session-intelligence:structural`
- root `typecheck`, `build:affected`, `lint:boundaries`
- CLI proof for plugin sync dry-run/drift/install-all and corpus smoke if available

## Integration Notes

- Production service-package calls now derive invocation option types from actual `Client` methods instead of a generic SDK helper.
- `createServiceInvocationOptions` is no longer exported from `@rawr/hq-sdk/boundary`; API/workflow internals retain `createInternalTraceForwardingOptions`.
- The projection-boundary ratchet covers production `apps/cli`, `apps/server`, `plugin-plugins`, `plugin-chatgpt-corpus`, and `plugin-session-tools` source.
- `@rawr/plugin-chatgpt-corpus` needed an oclif compiled command path correction so the corpus CLI smoke could exercise the linked plugin.
- `@rawr/hq-sdk:structural` was not used as a final gate for this slice because its runtime-public-seams check fails on pre-existing Phase 2 runtime scaffold gaps unrelated to this projection cleanup.
