> **Preserved evidence, not current authority.** Post-release function-first design direction; unimplemented and subject to recovered-frame review.
> Imported on 2026-09-15. Narrative retained; local links normalized where available.
> Unbundled local references are provenance text, not repository dependencies.
> See the [source register](../../SOURCES.md#prior-async) and [current assessment](../../assessment.md).

# Habitat Async: Functions, Not A Step Registry

Date: 2026-09-06. Baseline: Habitat 0.6.0, source `29365b34`;
Inngest 4.18.0 and Effect 4.0.0-beta.101.
Status: director's decision after exact-vendor proof and independent challenge;
implementation and full integration qualification remain ahead.
This is the async decision within the [boundary assessment](habitat-boundary-assessment.md),
not a new competing platform specification or an implemented repair.

## Decision

Replace the separately predeclared async-step layer with **function-first native
composition and a small process-owned Effect integration**. Do not implement the
previous recommendation to add arguments to registered step descriptors.

The owning function contains native step calls, their durable IDs, ordinary
control flow, and lexical use of previous results. Habitat selects and supplies
the declared capabilities; it does not connect step results, reconstruct a
durable execution context, or discover a step graph at startup.

This is a real semantic simplification, not just a nicer name for `.factory()`.
It does not justify rolling back native Effect, provider acquisition, process
selection, service binding, or the other runtime lanes.

Important correction to the strongest concern: current Habitat already calls
native `step.run`. It does **not** have its own durable result store, replay
interpreter, or workflow scheduler. The unnecessary ownership is its second
step-definition, selection, identity, and execution-dispatch contract. Removing
that contract is the warranted reversal; claiming an entire duplicate Inngest
engine exists would overstate the evidence.

This deliberately relinquishes static allowlisting of each step body. Today's
capabilities are selected at the plugin surface, not as narrower authority for
each step. No demonstrated consumer requires independently admitted step bodies,
and the current registry is not a sandbox for arbitrary TypeScript. Preserve
the actual selected capability boundary rather than that incidental restriction.

## Responsibilities

| Owner | Responsibility |
| --- | --- |
| Inngest | Native function registration, triggers, durable step discovery and identity, result serialization/memoization, re-entry, retries, waits, scheduling, and native cancellation semantics |
| Effect | Local programs, fibers, local resource scopes/finalizers, and explicit local error/retry/timeout composition |
| Habitat | Cold application/function selection, selected dependency wiring, process-owned native runtime/host integration, admitted local work and release ordering, correlated observations |
| Product service | Business state, invocation authority, idempotency, admission/recovery policy, and truthful terminal outcomes |

Two different meanings of context must stay separate. A process-local service
capability gives this invocation access to a selected service. A prior step
result is ordinary data returned by native Inngest and used in the handler.
Neither requires shipping a resource, Effect Context, or service client through
a durable step result. Correlation IDs do not become authorization.

Local service composition does not require a new RPC or gRPC transport.
Cross-function durable work remains native event publication or native function
invocation where the selected use case needs it.

## Why This Is The Smaller Correct Model

The current canonical rule forbids inline managed step bodies because the
compiler must enumerate executable descriptors without running or parsing the
workflow. That is a false dependency: cold planning needs function membership,
selected dependencies, and registration metadata, **not a precomputed inventory
of future step callbacks**. Native Inngest discovers the latter during execution.
Retaining a function closure is cold; constructing a native function does not
execute its handler.
Native registration can execute middleware `onRegister` hooks and update the
client's local list, so keep it in the correct lifecycle phase. This is not a
claim that arbitrary registration hooks are pure.

Current primary [function documentation](https://www.inngest.com/docs/learn/inngest-functions)
and [step documentation](https://www.inngest.com/docs/learn/inngest-steps) illustrate
the same model: a function contains `step.run` calls, and the next callback closes
over the previous result. Exact 4.18.0 source, rather than a moving documentation
page alone, governs the integration hooks and proof below.

Magic independently supports this direction. The furthest local branch is
`agent-codex-realize-dedicated-staging@f9a6aaf7`, one commit beyond
`main@3db8641a`; its only difference is Railway bootstrap wiring. Its async source
matches current remote main. Live remote inspection found no further async
development. Historical commit `3a0893c26` explicitly removed the optional
`src/steps` topology and required function-local durable calls. This is a verified
design correction, not just an illustrative directory layout. See the exact
branch, source, and history evidence (external source: `$HOME/Documents/Codex/2026-09-04/okay-so-it-s-been-about/work/async-function-design/magic-provenance.md`).

Magic's direct Effect/Bun resource setup is a consumer prototype, not code to
copy into Habitat. Its transferable lesson is native function composition over
ready process-local capabilities, not Magic's service topology or deployment.

| Candidate | Judgment |
| --- | --- |
| Keep step descriptors and add data arguments | Repairs a symptom while retaining a second authoring and compiler model; reject as the target |
| Function-local native steps plus selected Effect integration | Removes the unnecessary representation while retaining Habitat's integration role; selected direction |
| Hand every handler raw process resources and a ManagedRuntime | Removes ceremony but broadens authority and makes lifecycle correctness the consumer's burden; reject as the ordinary SDK |

Pure helpers and service operations can be reusable. They do not become
independently registered durable steps. Cron and event triggers vary the native
function; workflow, schedule, and consumer must not imply three execution
engines. Useful convenience names can survive only if they do not force a
second topology or prevent meaningful native combinations.

## Concrete Change Boundary

Source paths below are relative to
`/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq-template`.

1. **Definition and SDK:** retire `defineAsyncStepEffect`, `AsyncStepMembership`,
   descriptor-only `stepEffect(ctx).run`, and mandatory declaration `steps` lists.
   Infer event and capability types from the actual declarations. Keep native
   step result types and native callback composition, not a Habitat serializer.
2. **Derivation and compiler:** remove async step occurrences,
   `descriptorReferences`, and their membership/policy bijection from
   `derive-execution-descriptor-table.ts`, `derive-runtime-artifacts.ts`, and
   `compile-runtime-plan.ts`. Retain exact selected function/source membership,
   dependency and provider completeness, and coldness. No source parser or
   startup execution replaces the removed registry.
3. **Process integration:** simplify `async-function-bundle.ts` around the
   already provisioned native client and selected functions. Reuse existing
   process runtime, surface capabilities, and admission/continuation ownership
   for finite local Effect work. Do not retain the async descriptor registry
   behind a prettier helper. The general execution registry serves other lanes
   and is not removed merely because this lane no longer needs it.
4. **Policy and observation:** use native durable retry/cancellation policy.
   Deliberate bounded Effect retries/timeouts inside a callback remain valid
   local composition; do not silently multiply retry budgets or require an empty
   Habitat step-policy object. Observe native function/run/step identities rather
   than creating a new step identity system for telemetry.
5. **Authority and consumers:** correct active canonical rules, examples, SDK
   export/type tests, affected identity fixtures, and qualified blueprint
   successors together. Preserve immutable historical law and receipts. Publish
   the corrected packages before teaching them in the reference consumer.

The exact public helper spelling and dependency inference join still need a
small typed executable authoring comparison. Plugin-level selection already
exists; a new per-function dependency graph is not a prerequisite by assumption.
Likewise, do not promote a callback-only bridge restriction into a claim that
native Inngest forbids no-step functions or ordinary handler code. Separate what
is valid native behavior, what is supported by Habitat, and what is the preferred
placement of durable side effects.
The target should support the same finite selected-capability call inside a
step, in a no-step function, and in native `onFailure`; do not insert a synthetic
step to obtain injection. Failure handling is a current native invocation with
its own event and identity, not restoration of the original handler's context.

## Verified In This Loop

The exact-vendor investigation (external source: `$HOME/Documents/Codex/2026-09-04/okay-so-it-s-been-about/work/async-function-design/vendor-model.md`)
and executable probe (external source: `$HOME/Documents/Codex/2026-09-04/okay-so-it-s-been-about/work/async-function-design/vendor-inline-native.probe.ts`)
use the installed 4.18.0/beta.101 tuple. Root independently reran the probe and
strict TypeScript compilation successfully:

- Native function registration executes no authored callbacks and acquires no
  Effect service in the probe.
- A previous step result and native wait result compose lexically into an
  Effect-backed save of `42`; seeded native replay skips completed callbacks.
- Native middleware inference preserves event, selected Effect requirements,
  JSON result types, and the failure handler's injected capability. The negative
  type controls fail as intended.
- A finite native no-step function returns `102`. Native `onFailure` and a
  permanent error also use the native SDK paths successfully.
- An abandoned Effect continues beyond its native callback, proving callback
  tracking alone insufficient. Actual Effect tracking waits for its finalizer.
  Eight outer handler Promises remain pending after all finite work drains;
  tracking those would falsely prevent shutdown.

This is in-process native Serve dispatch with seeded protocol state and network
disabled, not a Dev Server persistence/restart proof or finished Habitat bridge.
The probe's temporary AsyncLocalStorage and tracking Sets are test instruments,
not new runtime owners to ship. Exact commands and source anchors are in the
vendor investigation.

The fresh ownership challenge (external source: `$HOME/Documents/Codex/2026-09-04/okay-so-it-s-been-about/work/async-function-design/fresh-challenge.md`)
independently examined what the current registry buys and found no counterexample
requiring it. Its three qualifications are accepted: removal of body allowlisting
is deliberate; callback-only access is not native law; settlement guarantees
cover named admitted operations and their owned finalizers, not arbitrary
JavaScript IO. It also identified the curated Promise cancellation limitation.
Root reran its timeout discriminator (external source: `$HOME/Documents/Codex/2026-09-04/okay-so-it-s-been-about/work/async-function-design/fresh-timeout.probe.ts`)
and strict typecheck successfully using the report's ES2024/source-import
options.

## Proof Required Before Landing

The important lifecycle distinction is finite local work versus the logical
durable run. Native function and `wrapStep` Promises may remain pending during
discovery. They are not resources to hold until a workflow eventually completes.
The exact SDK exposes `wrapStepHandler` around fresh callback execution; using
that hook does not itself prove every shutdown, no-step, or failure path.

- Native registration leaves all handler/Effect bodies unexecuted.
- Prior result, wait result, conditional work, and loop/fan-out use normal lexical
  data flow; replay skips completed callbacks without Habitat-managed state.
- Selected service/resource types reject undeclared requirements and wrong event
  types, including through the published public entry points.
- Actual admitted local Effect work and owned finalizers settle before provider release, even
  when a caller abandons its Promise. New roots are refused during drain while
  admitted descendants finish; retained or foreign invocation views do not gain
  new authority. Do not replace the existing tracker with a second one.
- Preserve native signal-aware Promise interop: the current curated
  `Effect.tryPromise` callback type and wrapper discard Effect's AbortSignal.
  Restore that capability and prove actual provider cancellation/finalization
  where used. An Effect timeout can finish while an opaque underlying Promise
  continues; neither `runPromise` nor callback settlement alone certifies all
  physical IO stopped. This is not evidence of premature release in a concrete
  provider, and it does not justify a new global IO tracker.
- Correlation uses native resolved step identity, including repeated-ID
  occurrence information, not merely the authored label. Parallel branches and
  failure functions must not share invocation-local state accidentally.
- Native permanent errors, retry budgets, cancellation, no-step behavior, and
  the chosen terminal-failure path have explicit, honest semantics. Native
  cancellation is not proof of interrupting an already running Effect.
- Preserve native app/function/trigger/step identities and compatible result
  shapes for in-flight runs. A rename or durable control-flow change requires a
  native migration decision, not just passing new tests.
- Repeat Serve and Connect local-provider acceptance, process isolation,
  installed-package tests, and the relevant cross-lane regressions. A seeded
  SDK protocol probe is not a real backend persistence/restart receipt.

## Work Ahead Remains One Story

This replaces the async portion of consumer-contract completion; it does not
erase request-client lifetime repair, direct SDK authoring, native client
interop, API exposure semantics, or stale teaching/policy corrections.

After those boundaries are corrected and released, the
[persistent reference application](habitat-reference-proof-plan.md) still owns
real Inngest history, EVLog operation semantics, stored HyperDX/ClickHouse
readback, and deliberate PostHog product events. Fast offline tests and full
provider proof remain separate guarantees. Civ7 and Magic stay independent.

The current design loop uses an Astra Max Inngest/Effect peer, Astra High Magic
provenance peer, root's integration/SDK review, and a fresh Astra Max ownership
challenger. Existing repository Designer/Engineer stewards already select Astra
Max/Medium and retain structural authority; vendor semantics must be an explicit
peer remit rather than implicitly assigned to those structural roles.

Skills used: framing-design (full foundations, principles, diagnostic and
solution-framing materials), solution-design, api-design with its SDK/local
leaflet, inngest with native Effect/replay references, and effect-inngest for
the protocol-versus-local-Effect distinction. Peer evidence records its additional
selected skills and exact source qualification.
