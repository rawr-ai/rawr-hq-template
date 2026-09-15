> **Preserved evidence, not current authority.** September 15 focused regression and published-probe evidence.
> Imported on 2026-09-15. Narrative retained; local links normalized where available.
> Unbundled local references are provenance text, not repository dependencies.
> See the [source register](../../SOURCES.md#runtime-evidence) and [current assessment](../../assessment.md).

# Runtime Foundation Evidence Pack

Date: 2026-09-15. Read-only investigation; no repairs implemented.

## Judgment

Keep the cold graph, native Effect resource lifecycle, selected capability model,
service binding model, and native vendor engines. Repair request-bound client
lifetime and signal forwarding; reconsider and remove the separate async step
authoring/selection/dispatch contract. That is a bounded architectural correction,
not evidence for replacing the whole runtime. Published 0.6.0 still contains all
three open defects/constraints below. The September 4 cold-pipeline defects are
fixed, not outstanding items to carry forward.

## Baselines And Verification

- Platform checkout: `55ce5a7fb`; accepted main: `29365b34c`; release gitHead
  supplied by the parent: `f52474a7`. Fresh `git diff --name-only` confirms no
  runtime or SDK source differences between release gitHead and accepted main,
  or between accepted main and current checkout. Current changes are Fluree
  documentation and research/probe artifacts, not shipped runtime repairs.
- The existing cold worktree at
  `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-root-habitat-runtime-cold`
  is clean at `29365b34c`. Its runtime/SDK sources match accepted main. No install,
  rebuild, branch move, checkout, external provider call, or network probe was made.
- Current platform checkout initially produced 18 passing leaf tests and three
  module-load failures: local `@orpc/experimental-effect@2.0.0-beta.23` lacks
  `createEffectClient`; local `@orpc/shared` is absent. These are environment
  failures, not fresh runtime regressions. No environment repair was attempted.
- Using the existing clean, correct dependency realm, **68 focused tests passed**:
  13 derivation cold-pipeline, 4 compiler, 14 invocation tracker, 5 async bundle,
  14 provider lifecycle, 6 server adapter, 1 async service-client, and 11 SDK
  binding/continuation/Effect-composition tests. This was leaf execution, not a
  claim that the full repository/release/Connect/provider acceptance ran.
- Existing published-package probes freshly passed their expected discriminators
  with SDK 0.6.0, oRPC 2.0.0-beta.32 and Effect 4.0.0-beta.101. Async type/native
  comparison used the existing exact Inngest 4.18.0 peer. Bun was 1.3.14.
- Final git checks: platform still has only the pre-existing untracked
  `.codex/config.toml`; cold worktree remains clean.

## Open Findings

### Request-Bound Clients: Reproduced

The same admitted server request returns 500 and executes zero service calls if
native middleware prebinds its service client before shutdown. Deferring binding
until the Effect handler returns 200; delegating native middleware through the
official `createProcedureClient` into an Effect procedure also returns 200.
Both direct and delegated native middleware patterns type-check. A separate
probe confirms native-created views can survive request return while
Effect-created views expire. Neither case released the resource prematurely;
release waited for the admitted request and occurred exactly once.

Current source anchors, relative to the platform repository:

- `packages/core/runtime/process-runtime/src/service-client-assembly.ts:14`
  captures only `admission.captureContinuation()` during binding; the captured
  value controls later context lookup and the native call interceptor at 19/31.
- `packages/core/runtime/process-runtime/src/invocation-tracker.ts:157` obtains
  that continuation from `Fiber.getCurrent()` only.
- `packages/core/runtime/process-runtime/src/server-request.ts:122` already
  supplies an explicit request lease and request-local capabilities, but
  `src/surface-capabilities.ts:23` returns unchanged construction clients;
  only its resource view uses the explicit continuation at 61.
- `packages/core/runtime/process-runtime/src/create-process-runtime.ts:179`
  likewise validates client binding via fiber capture.

Owner/disposition: Habitat process-runtime plus SDK/native request contract.
Project the existing admitted request continuation into service capabilities;
preserve process-cached construction, service-owned invocation validation,
named dependency assignments, and existing native-Promise settlement accounting.
Do not require users to discover which authoring positions happen to have a fiber.

Required proof: native middleware and Effect binding have identical admitted
descendant behavior during drain; new roots and expired/foreign views refuse;
retained streams and canceled/abandoned native calls settle before release.
The already lawful native oRPC delegation path is counterevidence to a claim
that native Promise interoperability requires a second runtime.

### Async Step Layer And Types: Reproduced And Source-Confirmed

- `packages/core/runtime/definition/src/async-context.ts:21` admits exactly one
  descriptor argument, with no call-time previous-result/wait-result input.
- `packages/core/runtime/process-runtime/src/async-function-bundle.ts:66` builds
  descriptor-to-boundary maps; 103-117 checks exact membership and executes the
  compiled body through **native** `step.run`, supplying original event data.
  Passing another argument cannot transport ordinary lexical data. Native
  Inngest owns JSON projection and replay; no Habitat durable result store or
  competing scheduler appears in this execution path.
- Fresh published strict TypeScript probe accepts a step requiring `{at: Date}`
  and another requiring an undeclared client under an unrelated `{count:number}`
  event and `services: {}`. Zero diagnostics, with negative controls confirming
  inferred output and rejected extra input. Membership is not context safety.
- `packages/core/runtime/definition/test/async-context.typecheck.ts:65` explicitly
  excludes the Habitat step bridge from native `onFailure`; 85-98 excludes
  clients/resources/runtime from outer handlers. These are implemented
  limitations, not missing type-test execution. Native failure callback lease
  checking exists at `async-function-bundle.ts:199`, but selected service-backed
  `onFailure` integration does not follow from it.

Owner/disposition: Habitat definition/SDK, derivation/compiler, and async
process integration, with matching law/observation/public-contract qualification.
Follow the existing function-first design decision, not the superseded proposal
to add descriptor arguments. Remove this lane's separate step inventory and
membership dispatch; retain cold function selection, explicit selected
capabilities, native step/result identity, and the common runtime/tracker.

Fresh exact-vendor discriminator: native registration executes zero callbacks
and acquires zero Effect resources; previous and wait results save 42; seeded
replay does not repeat the save; native no-step result is 102; native onFailure
and permanent-error paths run. An abandoned Effect remains tracked after its
callback ends and drains its finalizer. Eight outer function-handler Promises
remain pending after all finite work drains. Therefore neither outer-handler
settlement nor callback-only tracking is a sufficient lifetime contract.
This is in-process native Serve dispatch with network forbidden and seeded
protocol state, not Dev Server persistence, Connect, Cloud, or a shipped bridge.

Required proof: public types reject undeclared requirements/wrong event types;
ordinary lexical steps, waits, conditions and fan-out preserve native replay;
finite local Effects and finalizers drain even if unawaited; no-step and
onFailure use the same bounded capability integration without synthetic steps;
native identities/result shapes remain compatible for in-flight runs.

### AbortSignal: Reproduced

`packages/core/runtime/definition/src/effect.ts:109` declares a zero-argument
`try` callback; 323-324 invokes `attempt()` without the native AbortSignal.
A fresh direct published-package discriminator observed zero callback arguments
from Habitat and a real AbortSignal from native Effect on the same beta.101.
The existing timeout discriminator also freshly showed Effect failure while an
opaque underlying Promise remained pending, then fully settled its deferred work.

Owner/disposition: definition Effect facade and SDK public types. Forward native
signal-aware interop and test actual provider cancellation/finalization where
used. Do not equate Effect timeout with physical IO cancellation or infer a
concrete resource-release defect from the opaque-Promise discriminator. This
does not warrant a new generic global IO tracker.

## Sound Foundation And Fixed Earlier Findings

- One native process resource owner:
  `packages/core/runtime/substrate/effect/src/managed-runtime-handle.ts:27`
  constructs one native ManagedRuntime; `src/provider-lifecycle.ts:59` uses
  native Layer and 89 uses native acquireRelease. Release callback throws are
  deferred inside Effect and later releases continue. Fourteen fresh lifecycle
  tests cover rollback, finalizers, masking, interruption and late acquisition.
- One admitted-work owner:
  `packages/core/runtime/process-runtime/src/create-process-runtime.ts:80`
  drains the tracker before disposing resources; `src/execution-runtime.ts:171`
  retains the native managed execution Promise as a descendant; service-client
  assembly retains the native service Promise. Fourteen tracker and eleven SDK
  tests freshly prove expired/foreign refusal, admitted descendants, stream
  cleanup, native finalizers, construction rollback, named bindings and cold
  native Effect composition. They do not cover the native-prebinding bug above.
- Cold pipeline fixes are fresh regression successes, not historical claims:
  `packages/core/runtime/derivation/test/cold-pipeline.test.ts:312` selected-role
  coverage; 426 named children/aliases/slot swaps; 529 distinct explicit
  instances; 558 operation-count-bounded layered DAG; 590 divergent inherited
  refs/nested overrides still refuse; 641 malformed Unicode values and keys.
  Compiler slot-swap/alias regression passes at
  `packages/core/runtime/compiler/test/compile-runtime-plan.test.ts:170`.
- Mechanisms match tests: `derivation/src/derive-runtime-artifacts.ts:614`
  memoizes complete effective incoming requests before descending, retaining
  path overrides; 666 preserves named child binding assignments; 1245 filters
  selected roles before service/resource coverage. `identity-policy.ts:25`
  now explicitly rejects a trailing high surrogate.

## Falsifiers And Remaining Limits

Reopen the keep-foundation judgment if ordinary supported composition proves
that a competing durable scheduler/result store, another process resource
owner, or an alternate graph/identity model is necessary rather than these
bounded corrections. In particular: contradictory per-invocation lifetime
requirements across lanes; native replay forcing resource reacquisition for
memoized work; or accepted named/selected-process compositions that cannot be
represented after the existing normalization fixes would change the frame.
None was found here. A failed required proof of the proposed function-first
integration could still widen the redesign boundary; its design is not shipped.

Historical release/native-provider receipts remain historical. Source inspection
of `packages/core/sdk/test/fixtures/async-runtime.ts:448` confirms actual native
retry/history cases and 485-548 distinguishes platform cancellation from an
active local callback and release. They were not rerun in this bounded offline
audit. No fresh Cloud, Connect lease-loss, persisted collector readback, product
outbox, EVLog/PostHog, or whole-app quiescence guarantee is claimed.

## Repeatable Commands

Run from the existing clean cold worktree, using its installed dependencies:

```sh
bun test packages/core/runtime/derivation/test/cold-pipeline.test.ts packages/core/runtime/compiler/test/compile-runtime-plan.test.ts packages/core/runtime/process-runtime/test/invocation-tracker.test.ts packages/core/runtime/process-runtime/test/async-function-bundle.test.ts
bun test packages/core/runtime/process-runtime/test/server-adapters.test.ts packages/core/runtime/process-runtime/test/async-service-clients.test.ts packages/core/runtime/substrate/effect/test/provider-lifecycle.test.ts
bunx vitest run --project habitat-sdk packages/core/sdk/test/runtime-binding.test.ts packages/core/sdk/test/runtime-continuation.test.ts packages/core/sdk/test/effect-composition.test.ts
```

Run from `/Users/mateicanavra/Documents/Codex/2026-09-04/okay-so-it-s-been-about`:

```sh
bun work/boundary-audit/clients-probe.mjs
bun work/boundary-audit/fresh-contract-probe.mjs
bun work/async-function-design/vendor-inline-native.probe.ts
bun work/async-function-design/fresh-timeout.probe.ts
```

The signal callback-arity discriminator was run directly in memory against the
existing published-package realm; no probe file was created. Skills consulted:
official Nx workspace, native Inngest integration, Effect, and the separate
effect-inngest ownership overlay. The skill's older pinned tuple is guidance,
not substituted for the exact installed 4.18.0/beta.101 evidence.
