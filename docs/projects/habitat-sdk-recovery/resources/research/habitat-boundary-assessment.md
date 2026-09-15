> **Preserved evidence, not current authority.** Post-release findings; initial descriptor-argument repair superseded by function-first direction.
> Imported on 2026-09-15. Narrative retained; local links normalized where available.
> Unbundled local references are provenance text, not repository dependencies.
> See the [source register](../../SOURCES.md#prior-boundary) and [current assessment](../../assessment.md).

# Habitat Boundary Assessment

Date: 2026-09-06. Audited baseline: published SDK/CLI 0.6.0 and
`main@29365b34cbfeca636606af0f6b5d4c4ac07c1066`.
Status: audit complete; director's dispositions incorporate independent challenge. This is a
decision and repair inventory, not a claim that the repairs have shipped.

Follow-up: the owner's challenge to async ownership prompted a vendor-first
design loop. The [function-first decision](habitat-async-function-design.md)
replaces the earlier recommendation to preserve predeclared step descriptors
and add arguments. Other findings and the provider reference scope remain.

## Bottom Line

The substrate was not built wholly wrong, but this is **not only a cosmetic SDK
cleanup**. We reproduced one request-lifetime defect, an async context type hole,
and an unnecessarily restrictive managed-step data interface. Other unfinished
choices concern how native callers, dependencies, and server projections are
authored. The original SDK investigation was partially performed, then closed
without a complete disposition. That was a real process miss, not a failure of
the owner to communicate the intent.

The evidence does not justify reversing the runtime implementation. Native
Effect, process-owned acquisition/release, complete named service bindings,
native oRPC/Inngest execution, and cold selected execution remain useful. The
async counterexample showed the input limitation was not deep in Effect or
service construction. The follow-up comparison goes further: a precompiled step
inventory is not required by native Inngest and should be removed, rather than
patched with a second dataflow API. This changes the async integration contract,
not the native durable execution owner or the whole substrate.

The release receipts still establish the behavior they actually tested. They do
not establish that every intended authoring journey was possible or every
planned Habitat capability was complete. I would not yet present 0.6's authoring
patterns as the settled template for Civ7 or Magic. This is a bounded contract
completion before the independent reference application, not a restart of those
products or of the entire substrate.

## What Must Change

| Disposition | Finding | Required Outcome |
| --- | --- | --- |
| Repair runtime behavior | Native-middleware-created service clients lose their request continuation | The same admitted request has the same lifetime regardless of native middleware or Effect-handler binding |
| Preserve native cancellation capability | Curated `Effect.tryPromise` removes the native callback's AbortSignal | Restore signal-aware interop and qualify actual operation settlement; do not claim arbitrary Promises become cancellable |
| Simplify async ownership and repair types | Predeclared managed steps obstruct native lexical dataflow; incompatible event/client contexts type-check | Functions own native inline steps; remove the separate step registry while preserving selected capabilities, native replay, and finite local work |
| Complete and simplify SDK design | Public `.factory()` and several declaration/context decisions were never fully dispositioned | One ordinary lane declaration interface; modifiers only for real semantic variation; inference follows selected dependencies |
| Reconcile native interoperability | Injected clients return Effects; a lawful native oRPC delegation path exists but is not the direct Promise face | Choose and teach the least-complex native calling pattern without adding a redundant client abstraction |
| Reconcile API semantics | Public/internal classification is also hardcoded to OpenAPI/RPC and documentation behavior | Protocol, publication, and caller policy are not mistaken for one another or duplicated domain ownership |
| Correct active teaching and policy | Some canonical examples describe superseded context fields; policy still requires factory syntax | Executable examples and active rules agree with the accepted public API, without rewriting historical evidence |
| Complete integration proof | EVLog/PostHog and persisted HyperDX/ClickHouse results are not delivered by runtime release | One coherent persistent consumer, real provider readback, and honest offline versus full-path proof |

These are coupled repairs and decisions, not new platform projects.

### Request Lifetime

In a published-package probe, native middleware constructs a service view and
passes it to an Effect handler. This type-checks. Once shutdown closes new root
admissions, that already admitted request returns HTTP 500 on its service call.
Moving only the client construction into the Effect handler produces HTTP 200.
Resources still wait for request settlement in both cases: the demonstrated
failure is refusal of valid descendant work, not premature release.
The current specification describes the narrow fiber-capture mechanism, so
this is not simply code diverging from an otherwise perfect specification.
Clarify the native-request contract and repair its integration together.

A native-handler-created view can also outlive that request while an
Effect-created view expires. Client assembly captures the current Effect fiber,
but native middleware does not have that fiber. The minimum repair is an
explicit request-bound capability view using the existing continuation, not a
second runtime, ambient service lookup, or a changed construction cache.

Keep the distinction between construction dependencies/configuration and each
call's actor/invocation data. Keep service-owned invocation validation and named
child assignments. Simplifying wrappers must not silently copy authority between
services or cache request identity in process-owned state.

Evidence: client journeys and exact source locations (external source: `$HOME/Documents/Codex/2026-09-04/okay-so-it-s-been-about/work/boundary-audit/clients.md`),
published runtime probe (external source: `$HOME/Documents/Codex/2026-09-04/okay-so-it-s-been-about/work/boundary-audit/clients-probe.mjs`),
TypeScript probe (external source: `$HOME/Documents/Codex/2026-09-04/okay-so-it-s-been-about/work/boundary-audit/clients-type-probe.mjs`).

### Async Ownership And Types

`stepEffect(ctx).run(step)` has no argument for a previous result, wait result,
or loop item. Passing a second argument is rejected by TypeScript and ignored
at runtime when type checking is bypassed. A newly copied closure-bearing
descriptor is rightly rejected as unselected. The existing compiled body does
receive the value when the private invocation context supplies it.

Mutating the original event can work around this in the current implementation;
combining operations in one step or rereading persisted state can also be lawful.
Those are not substitutes for an independently retryable, data-dependent second
step. The initial audit correctly found a missing capability but prematurely
preserved the descriptor as the thing to repair.

Separately, a step annotated to require a Date and an undeclared client is
accepted under an unrelated event schema and an empty service selection. Exact
descriptor membership does not prove context compatibility. Fix that type
connection in the function-first design; do not add another argument transport
to compensate for a representation the native vendor does not require.

The bounded [follow-up design](habitat-async-function-design.md) compares exact
Inngest 4.18.0 source, native executable probes, and Magic's furthest-developed
branch including live remote verification. Its direction is removal of the
separate step-definition/membership/dispatch layer. Inngest already owns result
serialization, memoization, and replay in current Habitat; there is no evidence
of a Habitat durable result store or scheduler to remove. Habitat's remaining
role is cold function/dependency selection and finite process-local integration.

Preserve native checkpoint/replay, occurrence identity, explicit service
invocation, and finite actual-callback drain. Do not equate native cancellation
with aborting an active Effect or local process stop with whole-app quiescence.
The reference must also demonstrate a truthful terminal-failure path; direct
service-backed `onFailure` is not currently implemented, so qualify a native
failure-event consumer or a bounded managed callback path rather than inventing
product success from a generic lifecycle receipt. Typed fan-out and permanent
input/retry policy receive targeted decisions only where that journey uses them.

Evidence: five async journeys, ablations, and executable probe (external source: `$HOME/Documents/Codex/2026-09-04/okay-so-it-s-been-about/work/boundary-audit/async.md`).

### Native Promise Cancellation

The fresh async ownership review found a related shared SDK narrowing:
`HabitatEffectFacade.tryPromise` types `try` as a zero-argument callback, and its
implementation invokes `attempt()` without forwarding native Effect's
AbortSignal. Restore and qualify that native capability; this is not a reason
to invent another cancellation system.

The bounded probe also demonstrates an important limit: an Effect timeout can
finish while an opaque underlying Promise continues. That alone does not prove
premature release of a real Habitat provider. Existing service calls have
independent native-Promise accounting, and resource adapters have their own
scopes/finalizers. Qualify those actual owner boundaries instead of promising
universal physical IO cancellation from `runPromise` settlement or adding a
generic raw-operation tracker. See the
fresh ownership challenge (external source: `$HOME/Documents/Codex/2026-09-04/okay-so-it-s-been-about/work/async-function-design/fresh-challenge.md`).

### SDK And Exposure

The `.factory()` spelling is public, not merely behind the scenes. The
[old improvement document](rawr-sdk-ergonomics-proposal.md)
explicitly proposed removing it. A root ablation against SDK 0.6 shows that the
extra CLI construction hop can be removed while preserving cold option
resolution and named instances. This is not yet a full cross-lane typing proof.

My direction is direct lane builders with a uniform ordinary grammar. Bare
service/resource declarations should normalize to existing identities where
they contain no modifiers; explicit instance, binding, optionality, and provider
requirements still carry real information. Audit all the old document's
independent proposals, not just its headline syntax. Do not restore its obsolete
custom Effect representation, universal interpreter, or ban on native handlers.
Resource contracts, requirements, and provider selections are not interchangeable
wrappers. Qualify each proposed default normalization; the CLI ablation alone
does not establish resource identity or cross-lane type correctness.

Native Promise interoperability is a separate decision from client spelling.
Fresh review found a lawful current route: native middleware calls a locally
owned official `.effect` procedure through native `createProcedureClient`, then
continues with its result. The delegate can bind its service inside the existing
Effect continuation; no user-owned runner or new managed runtime is required.
That narrows the earlier specialist assessment: direct Promise calls on injected
clients are absent, but native service composition is not impossible.

Use this native route as the baseline before deciding whether a small helper or
a facet over the already existing native client earns its place. Do not make
Effects implicitly thenable. The counterexample does not excuse the prebound
client lifetime bug. Error, cancellation, abandonment, streaming, and drain
parity must qualify whichever authoring path becomes canonical.

Likewise, `internal` currently does not mean authenticated or network-isolated;
the canonical runtime document says so. Both kinds can use real policy
middleware. There is no demonstrated authorization vulnerability here. There
is an unnecessary coupling to transport: first-party REST becomes `api`, while
public browser RPC becomes `internal`. Decouple those concerns without merging
genuinely different privileged/public contracts. One native implementer already
underlies both SDK implementation names.
Resolving this decision does not require implementing every combination of
protocol, publication, or client facet before the consumer. Qualify the smallest
accepted contract that supports the real native caller journeys.

Encore offers a useful narrow comparison: API exposure/authentication are
declaration options, not different execution engines. Its static-analysis
constraints are not Habitat's architecture. Native oRPC remains the closer
mechanical reference. [Encore API declarations](https://encore.dev/docs/ts/primitives/defining-apis),
[oRPC procedures](https://orpc.dev/docs/procedure).

Host-side web Effects currently cannot select services, even though they can
select resources. Browser isolation does not itself justify that server-side
restriction. Record it as a real limitation requiring an explicit product
decision, not as completed functionality. The chosen reference already uses a
server API for its browser, so adding host-local service binding is not
automatically a prerequisite or a reason to build a new web framework.

### Teaching, Authority, And Knowledge

Active examples still refer to superseded server context helpers such as
`request.requireActor()` and an old `execution.traceId`, or call a child client
without its required invocation binding. Fix these against actual public
imports, with compile/run checks. Correct factory-enforcing law with the API
change through the repository's authority/versioning process. Preserve frozen
blueprint revisions and historical receipts; do not edit history to make it
look as though the new interface always existed.

Reusable Marketplace skills have another incomplete handoff: Habitat qualified
oRPC beta.32 / Effect beta.101, while relevant canonical skill profiles still
classify beta.17 and stop on unclassified tuples. Preserve old fixtures as old
receipts; add only the newly qualified relevant profile and changed advice.
The async follow-up also confirms the native Inngest skill's frozen 4.13.0 lane
is stale for installed 4.18.0; middleware semantics require exact-tuple evidence.
There is no need for a blanket dependency upgrade, mini-repository collection,
or refresh of unrelated skills. Existing references are the starting point.

No additional stale executable rule was substantiated by the bounded provenance
pass beyond factory enforcement. The client/source pass did substantiate stale
active examples and the binding/exposure constraints above. This is the deletion
and correction boundary, not permission to purge everything that looks old.

Evidence: provenance disposition and source links (external source: `$HOME/Documents/Codex/2026-09-04/okay-so-it-s-been-about/work/boundary-audit/provenance.md`).

### Old SDK Proposal Disposition

This is a decision on each independent change set, not a claim that its old
sample code now runs. Implementation acceptance belongs to the workstream below.

| Original Change Set | Current Disposition |
| --- | --- |
| A: public surface tiers | Keep ordinary authoring free of private runtime machinery. Teach actual current exports; do not add a warning/error rule merely because the old proposal suggested one. |
| B: direct plugin builders | Adopt the simplification; preserve optioned and named-instance construction. Cross-lane inference and compatibility remain to qualify. |
| C: homologous plugin grammar | Adopt a consistent ordinary declaration pattern, not one universal host shape. Keep lane-specific native facts where meaningful. |
| D: direct service/resource maps | Adopt normalization where wrappers add no information; retain explicit modifiers and exact identities. |
| E: projected resource access | Improve typed access from declared facts with D/L; preserve optional absence, ownership, and request lifetime. Do not add a second container. |
| F: service dependency maps | Simplify service/resource declaration categories into the existing canonical dependency model; do not change cache or ownership semantics for syntax. |
| G: curated Effect imports | Keep native Effect and curated entry points without discarding useful native capabilities such as signal-aware Promise interop. Reject restoration of the old custom value/interpreter. |
| H: invocation/client ergonomics | Retain service-owned invocation mapping; repair native continuation and qualify native caller interoperability. Reject automatic inference of authority from async event identity. |
| I: service package topology | Preserve domain and module ownership, not every historical file spelling. Correct stale examples; no blanket service-internal refactor. |
| J: author diagnostics | Defer the optional new renderer unless a concrete author-repair journey needs it; existing useful diagnostics remain. |
| K: native host ownership | Keep native parsing/dispatch/lifecycle and Habitat-owned selected execution. Update wording per actual lane; do not impose a universal descriptor interpreter on native oRPC. |
| L: declaration-to-context typing | Adopt as a required contract; the reproduced async mismatch demonstrates unfinished work. Qualify equivalent selected-client/resource inference across the authored lanes. |

## What Remains Separate

Blueprints are architectural kinds; concrete services are instances. Niches are
governed communities of instances, not synonyms for either. Habitat preserves
that distinction but has not implemented first-class niche admission,
capability activation, and the richer relation protocol. Civ7's machine-readable
niche layer is also transitional. Two application services should not become
two domain-named blueprint kinds to make a demo look complete.

The reference can qualify instances against the generic service blueprint and
an honest application overlay. It must not call that full niche implementation.
There is no evidence that every existing runtime blueprint is misclassified.

Other separately retained work stays separate: D-1 semantic ledger; D-2 temporal
inquiry; D-3 remaining Rawr transfers; D-4 native agent/desktop hosts; and the
separately unqualified MCP artifact. These are not erased by runtime release
and are not silently pulled into this recovery.

The optional author-diagnostic renderer is not a new mandatory SDK object.
First test whether existing messages let an author repair missing-provider and
invalid-binding failures. Add a renderer only if that reveals a concrete need.
Type-fest, broader Effect-platform/Encore comparisons, and general skill refresh
remain conditional inputs, not gates or reasons to replace working mechanisms.

## The Next Workstream

This assessment is the prerequisite contract inventory for the existing
[reference proof plan](habitat-reference-proof-plan.md), not a competing runtime
specification. Move through three complete outcomes:

1. **Close the consumer contracts.** Repair native request-client lifetime,
   restore native signal-aware Promise interop where the facade narrows it, and
   replace registered async steps with native function-local composition and
   correctly inferred capability types. Resolve direct authoring, native client
   interop,
   and transport/exposure semantics with minimal typed executable journeys.
   Carry each accepted change through SDK, active law, examples, tests, and
   installed packages together. Explicitly retain or defer independent proposals
   so an investigation note cannot masquerade as delivered work again.
2. **Publish and teach the corrected boundary.** Qualify same-process service
   composition, native middleware, CLI, async retry/re-entry, and the selected
   browser-to-API route. Preserve existing process/resource regressions. Update
   the materially stale vendor skill profiles from those exact receipts.
   Release reusable changes; use the actual published versions in the consumer.
3. **Complete the persistent reference and D-5.** Build the bounded batch-import
   workbench with catalog/imports ownership, persistence and recovery. Include
   real Inngest history, EVLog operation semantics, HyperDX/ClickHouse stored
   records, and deliberate PostHog product events with readback. Do not mandate
   an outbox by architecture: prove that an accepted durable batch cannot become
   stranded or falsely complete across the failure windows the product claims.

The stopping point is a runnable reference with repeatable provider receipts,
documented invocation/authoring semantics, and no undispositioned finding in
those specific journeys. It is not "all future Habitat implemented." Ordinary
offline tests remain fast and container-free; full-path tests prove different
guarantees. Missing hosted credentials would be an explicit unfinished readback
gate, not a synthetic pass.

## Review And Verification

The historical Civ7 threads were retrieved for their framing and agent practice,
not used as instructions to copy product architecture. The relevant correction
is intent-first consumer journeys, continuity specialists, then genuinely fresh
source/counterexample reviewers. Review count itself is not the acceptance gate.
Existing structural stewards already select Astra; this audit used explicit
Astra Max domain investigations and separate fresh Astra review contexts.

Root reran the public CLI ablation, published client runtime/type probes, the
async derivation/compilation/execution/type/native-argument probe, and 20 focused
tests with 240 assertions in the exact retained worktree. Client source-suite
attempts in the primary checkout were blocked by
stale/missing dependencies before execution; published-package probes were used
instead. No new live provider run or full-repository acceptance is claimed.

Fresh contract review (external source: `$HOME/Documents/Codex/2026-09-04/okay-so-it-s-been-about/work/boundary-audit/fresh-contract-review.md`) and
scope/provenance review (external source: `$HOME/Documents/Codex/2026-09-04/okay-so-it-s-been-about/work/boundary-audit/fresh-scope-review.md`) are complete.
The initial review accepted the two demonstrated correctness repairs and an
explicit async input capability for the selected consumer, rejected blanket
native-composition
impossibility and authorization-vulnerability claims, and retained the narrower
web/optional-feature boundaries. Root also reran the fresh public-import
counterexample and type probe (external source: `$HOME/Documents/Codex/2026-09-04/okay-so-it-s-been-about/work/boundary-audit/fresh-contract-probe.mjs`).
Its native delegate passes scalar continuation/type proof; abort, exact error,
stream cleanup and telemetry parity are still future qualification, not passes.

The subsequent function-first loop supersedes the input-argument repair
direction, not those probes' observations. Its evidence and additional
qualification boundaries are recorded in the linked async decision.

No source, configuration, held WIP, or provider state was changed by this audit.
These findings and directions are not implemented repairs. The detailed frame,
specialist evidence and bounded comparator/process notes are in
`work/boundary-audit` (external source: `$HOME/Documents/Codex/2026-09-04/okay-so-it-s-been-about/work/boundary-audit`).
