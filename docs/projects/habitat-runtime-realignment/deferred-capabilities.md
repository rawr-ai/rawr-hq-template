# Deferred Capabilities

This is the single live handoff for parked capabilities retained outside the
published SDK/CLI 0.6.0 runtime. It owns their destinations, reactivation
conditions, acceptance, and source-to-destination accounting. Promotion preserves
these promises; it does not activate future work or create another plan.
Deferral changes delivery dependency, not promised behavior or ownership.
Nothing here authorizes deleting, merging, restacking, or editing a held source
worktree. The canonical [architecture](../../system/HABITAT_ARCHITECTURE.md),
[runtime realization](../../system/HABITAT_RUNTIME_REALIZATION.md), and accepted
[OpenSpec specifications](../../../openspec/specs/) remain normative.

The [original handoff](../../../openspec/changes/realize-app-runtime-spine/deferred-capabilities.md),
[runtime tasks](../../../openspec/changes/realize-app-runtime-spine/tasks.md),
[obligation disposition](../../../openspec/changes/realize-app-runtime-spine/obligation-disposition.md),
[classification ledger](../../../openspec/changes/realize-app-runtime-spine/classification-ledger.md),
and [stack cut sheet](../../../openspec/changes/realize-app-runtime-spine/stack-cut-sheet.md)
preserve delivery, source accounting, acceptance targets, and held-source
disposition as historical provenance. Earlier exact contracts and receipts remain
intact in the
[quarantined app-runtime requirement](quarantine/openspec-baseline/specs/app-runtime-realization/spec.md)
and its [source ledger](quarantine/openspec-baseline/classification-ledger.md).
These historical records are evidence, not a second live authority.

## Delivery Boundaries

| Record | Retained capability | Reactivation condition | Release relationship |
|---|---|---|---|
| D-1 | Provider-neutral semantic ledger and a conforming native backend integration | A separately scoped owner accepts the contract, current vendor qualification, implementation, and real-substrate conformance below. An external maintenance commitment requires separate authorization. | Its own accepted SDK integration release. The generic substrate, hosts, and core runtime release do not wait for it. |
| D-2 | Generic temporal inquiry, provider lifecycle, and opt-in native Nx projection | A separately scoped owner accepts the generic inquiry contract and qualifies the backend behaviors it actually uses. | Its own accepted SDK integration release, with CLI release accounting when its Nx projection changes. It is neither a core release prerequisite nor automatically dependent on all of D-1. |
| D-3 | Remaining Rawr workstream, research, session, and governance transfers | Each destination receives owner handoff, reviews unique source behavior against current Rawr, and proves only its actual released Habitat dependencies. | Destination-owned adoption. No global ledger, inquiry, or runtime completion barrier applies to every sink. |
| D-4 | Native agent/OpenShell and desktop host integration | The selected host and its security/policy boundary are qualified against the retained canonical harness contract, with real invocation, cancellation, shutdown, and lifecycle proof. | Separate accepted host integration/release. Agent/desktop authoring and managed executable/schema faces are implemented, not deferred. |
| D-5 | Backend telemetry persistence, native exception export policy, and semantic event integration | The observability owner qualifies the selected backend and export policy before external deployment; EVLog is evaluated against actual native boundary needs. | Separate full-observability qualification, not a replacement for current container-free native OTLP and lifecycle receipts. |

The historical SDK paths, TypeScript names, descriptor literals, provider
configuration spelling, package metadata, and source layout are a design
baseline to review at reactivation. They are not claims that those exports exist
in the current SDK. Essential promises below may not silently disappear during
that review. A changed public promise requires an explicit before/after decision
and corresponding consumer/acceptance accounting, not an implementation shortcut.
Private file totals, document totals, exact diff size, and historical project or
edge counts impose no reactivation constraint.

## D-1: Semantic Ledger

### Ownership And Public Capability

The neutral resource belongs at the semantic-ledger resource owner, with a
nested concrete provider and the SDK as the only public package surface. The
held source is
`77b6c38e8701b8ac9292ef5676385a5e6e096f2:resources/semantic-ledger/**`,
subtree `859b463650e7ad769a56d1b67f328e84584479ef`. It is evidence to re-author,
not a merge or copy instruction. The complete baseline contract is the
quarantined requirement
[Semantic-ledger authority is closed before source activation](quarantine/openspec-baseline/specs/app-runtime-realization/spec.md#requirement-semantic-ledger-authority-is-closed-before-source-activation).

Preserve these public capabilities, irrespective of a later reviewed spelling:

- Ledger creation/availability and authoritative line head.
- Atomic guarded proposal with line-scoped identity and an applied or refused
  receipt. Guard-unmatched and already-proposed are successful refusal values,
  not typed failures.
- Historical bounded graph selection using typed variables, IRIs, string
  literals, graph nodes/properties, triple patterns, and projected bindings.
- Fork, nonmutating merge preview, merge, and family line enumeration.
- Readonly public shapes, frozen constructed terms and returned values, and
  non-Promise `HabitatEffect` operations with typed, bounded, redacted failures.
  Preserve the distinguishable invalid-input, missing-ledger, unreached-time,
  transport, backend, and merge-conflict categories. Unexpected defects remain
  defects rather than being recast as ordinary typed failures.

The baseline names are `ensureLedger`, `head`, `propose`, `select`, `fork`,
`previewMerge`, `merge`, and `lines`; its proposed SDK projections were
`@habitat-ai/sdk/resources/semantic-ledger` and the static `/fluree` provider
entry. Those names remain traceable design input, not an already published API.
The resource exposes no vendor driver, fetch object, Promise API, provider
factory, collision strategy, Rawr working-frame policy, or plan-body accessor.
An in-memory implementation remains owner-local conformance, not a second
production provider merely to bypass native qualification.

The baseline resource is process-lifetime. Its provider accepts cold,
provider-owned normalized configuration and builds a definition-owned Effect
plan with a required no-argument release callback. The real substrate alone
owns acquisition, execution, and release. Resource-to-provider reachability,
host-owned provider construction, or a second lifecycle owner is not admitted.

### Ledger And Query Semantics

1. History is append-only; each line's own positions are monotonic. A proposal
   identity is line-scoped and bounded. Guard evaluation and the accepted write
   are atomic under contention.
2. Proposal equality is equality of canonical ground RDF triples plus guard
   conjunction sets, not object identity, graph-node grouping, declaration
   order, or duplicate presentation. Store the exact canonical body for
   same-acquisition comparison, not only its digest. Different content under an
   existing identity refuses without a second write.
3. The data model is a default-graph RDF triple set. Selection is a plain
   projection bag: no implicit `DISTINCT`, local row deduplication, or result-row
   sorting. Literals are admitted only in object position. Caller variable names
   and logical IRIs are never raw query interpolation.
4. Returned heads, receipts, rows, and collections are fresh frozen public data.
   Numeric positions, merge counters, and flake counts must be present
   nonnegative safe integers, not coerced strings, fractions, missing defaults,
   `NaN`, or infinities.

### Unrestricted Ancestry-Based Merge

The retained contract is unrestricted native merge by commit ancestry, not
"merge only in one safe sequence." Repeated, reverse, cousin, nested, factless,
and criss-cross histories remain within the required conformance space.

- A logical conflict slot is `(subject, predicate)`. Both sides changing that
  slot conflicts even when the final object sets happen to be equal. A change
  on only one side, or changes to different predicates on one subject, is clean.
  A conflict aborts natively with no write.
- Preview `ahead` and `behind` count source-only and target-only reachable
  commits. `conflicts` counts conflicting logical slots, and `mergeable` is
  exactly zero conflicts. Preview never mutates.
- A fast-forward imports missing commits without a synthetic target commit and
  takes the source head. An already-current merge copies zero and creates no
  commit. A general merge imports all source-only history, retains source-local
  positions, and creates one native two-parent target commit at the target's
  pre-merge position plus one, even when imported source positions are higher.
  The copied count equals preview ahead and excludes the new merge commit.
- No walk that decides preview, conflict delta, source replay, or copied history
  may replace ancestry/reachable-set membership with a numeric `t` cutoff or
  one presumed fork-point topology.
- Historical selection at a position preserves the baseline semantics when
  imported chains overlap numerically: union the reachable chains through that
  position. Do not renumber imported history or promise that every numeric
  position then identifies one commit.

A fail-closed no-merge capability, provider-side emulation, proxy/sidecar,
preflight or single-actor restriction, acquisition epoch, and sequence
restriction do not satisfy this full contract. They require a separate scope
decision if proposed, rather than being labeled an implementation of D-1.

### Native Vendor Qualification

The historical source inspection rejected numeric-cutoff candidates:
`v4.1.4@07316fa440548247e8985215b8151965d2c72726`,
`v4.1.5@d767927dae550a6ecde8f15603ad9c195de60351`, and then-observed
`main@a85e0368285575204d75227742ac9d8ee5d1f0a7`.
Those are source-predicate failures. The recorded F1/F2 result for those
non-survivors was not-run, not a failed live experiment. The dated inventory is
not a claim about every current or future official option.

At reactivation, inspect current vendor options before choosing an artifact or
requesting any maintenance commitment. A source survivor must be selected by
immutable tag/commit, exact OCI digest, and reproducible provenance, then pass
disposable live tests on every claimed platform against that same artifact.
Source inspection may reject a candidate but cannot qualify it. Fake HTTP
proves encoding/status/decoding only, never native commit-graph behavior.

Preserve all three qualification vectors:

1. **F1, high-source/low-target general merge.** Produce a clean non-fast-forward
   merge whose new target head is below imported source positions. Prove exact
   replay and native counters. Read the true target head from the matching
   branch-list `BranchInfo.t`, not an ambiguous info/log inference.
2. **F2, target-cutoff conflict.** Fork a descendant from the high-position
   source, change the same logical slot on both sides with the target-side
   change below the former ancestor cutoff, and repeat above it. Prove exact
   ahead/behind/conflict counts and native abort with no write.
3. **F2, independent source-cutoff replay/copy.** From a fresh F1 history, add a
   disjoint low-line fact at or below the high ancestor position and advance the
   original high target to force a general merge. Prove every reachable
   source-only commit is counted and replayed, target facts survive, conflicts
   are zero, copied equals ahead, and the new target commit is at its prior
   position plus one with exactly two parents.

The provider's accepted conformance must repeat these vectors; a one-time
qualification receipt does not replace regression protection. A corrected
external fork is not presumed user-authorized. External organization ownership,
publication, licensing/security, notices, reproducible build, supported-platform
evidence, and ongoing maintenance are separately authorized commitments if
current native options cannot satisfy the contract. The published core runtime
continues independently while that decision is unresolved.

### Single-Flight, Interruption, And Lost Answers

The same-acquisition lost-answer promise is retained in full:

- Install one table entry for exact `(ledger, identity)` before the first POST.
  It holds the exact canonical body, send count, and running/indeterminate/settled
  state. The table owns the producer; the initiating caller is only its first
  waiter. Same-body callers join without another transport write. Different-body
  callers neither wait nor send and refuse at a valid non-writing head.
- The initial absolute deadline covers the initial POST, submission reads,
  polling, and any permitted replacement. Allow one initial send and at most one
  replacement, only after a strict unknown result before that deadline consumes
  the replacement permit atomically. Starting the replacement or reaching the
  initial deadline closes writes permanently. An answered in-progress result
  closes writes and polls; it is not an already-proposed refusal.
- Committed submission data settles to the exact receipt; failed submission data
  settles to a backend failure. Determinate receipts, typed failures, and defects
  replay with their original category for the acquisition. Do not turn defects
  into typed failures or cache caller interruption.
- A transport failure or deadline after an unanswered write returns a transport
  failure to the current waiter but leaves the entry indeterminate, with exact
  body and send count retained and writes closed. That temporary outcome is not
  memoized as the producer's terminal result.
- A later same-body caller starts or joins shared read-only recovery with a fresh
  deadline. Recovery may only GET/poll submission state, including unknown and
  in-progress results; it may never POST again. Committed, failed, malformed or
  contradictory terminal data, and unexpected defects settle in their original
  categories. A read timeout leaves the entry indeterminate for later read-only
  recovery. There is no promise across provider reacquisition, process restart,
  or lost backend submission records.
- Promise-level tests abandon the creator and a follower independently while the
  producer and remaining waiter complete with one write. Real-substrate Effect
  tests interrupt the creator and a follower on separate identities: only the
  selected waiter has interruption Cause; the producer is not aborted, the entry
  is not cleared, another waiter receives the receipt without hanging, and later
  replay is exact. Promise abandonment is not advertised as Effect interruption
  proof.

No public runner, driver seam, plan accessor, or witness getter is needed to
prove these behaviors. Private driver conformance and real-substrate execution
have distinct owners and neither may claim the other's evidence.

### Safety, Coldness, And Acceptance

The preserved baseline safety model includes:

- An injective, reversible private storage encoding of the complete UTF-8 logical
  IRI, without normalization. The baseline uses one fixed namespace,
  `urn:habitat:semantic-ledger:iri:`, and canonical unpadded base64url tokens.
  Decode only expected-prefix canonical tokens and valid UTF-8; do not admit
  alternate representations as extra logical names.
- Escaped literal construction, including C0/C1 controls; safe generated
  `?vN` aliases instead of caller variable interpolation; own-data binding
  properties safe for names such as `__proto__`; and nonempty, unique projected
  variables present in the query. Alias assignment is stable and sorted while
  returned binding keys preserve the caller's projection order. Missing,
  surplus, or unrecognized projected
  cells are backend failures, not lossy partial rows.
- Bounded line and identity validation before transport. Preserve one-colon line
  identity, same-family fork/merge, bare-family enumeration, and sorted unique
  frozen lines. The baseline family pattern is
  `[A-Za-z][A-Za-z0-9.-]{0,127}`, branch pattern
  `[A-Za-z0-9][A-Za-z0-9._-]{0,127}`, and proposal identity and variable limits
  are 128 UTF-8 bytes. These are input-safety choices, not file-count ceilings.
- Bounded redacted failures: the baseline detail bound is 4096 UTF-16 units
  (4093 plus `...` when truncated), with no raw URL, headers, request body,
  proposal identity, response body, or exception disclosure.
- Provider-owned closed RuntimeSchema validation and frozen normalized required
  config output. The baseline URL is absolute HTTP(S), at most 2048 characters,
  without credentials/query/fragment; timeout is 100-300000 milliseconds with a
  30000 default. TypeBox default annotations alone are not normalization.
- Strict HTTP route/status/shape validation, exact idempotency/submission echoes,
  and no fabricated zero, false, or empty-list fallback for malformed success.
  Extra native fields may be ignored only where the required public projection
  remains exact. Reject zero-triple proposals and zero-write aggregates; use
  the native sentinel distinction for guard refusal. A positive conflict report
  after a write is backend failure, not a truthful no-write merge-conflict result.
- Fresh-process import and plan-build checks with a throwing/counting global
  fetch getter: zero reads, fetches, Promises, acquisition, release, or ledger
  operations until real provider acquisition. Include neutral SDK and static
  provider entries in installed-package proof.

Reactivation must run resource shared/memory conformance, provider codec and
driver conformance, strict type/public-surface proof, installed SDK coldness,
live exact-artifact F1/F2, and real-substrate acquisition/release,
failure/cleanup, waiter interruption, and recovery proof. Preserve the named
targets `@habitat-ai/resource-semantic-ledger:test`,
`provider-semantic-ledger-fluree-http:test`, `@habitat-ai/sdk:test`, and
installed-package acceptance, adding proof at the actual substrate owner rather
than reserving an empty owner or a predetermined source corpus.

Only then may D-1 claim an independently accepted SDK integration release.
Current configuration limits or API spelling can change through an explicit
reactivation design decision with equivalent safety and migration accounting;
no such change is implied by this deferral.

## D-2: Temporal Inquiry

### Retained Generic Contract

The source families are recorded in the
[held temporal source matrix](../../../openspec/changes/realize-app-runtime-spine/stack-cut-sheet.md#temporal-source-disposition),
especially `602b1207a51c` and `5fcb3257933`. Preserve generic bounded temporal
read/write and immutable projection/materialization, snapshots and their
provenance/time semantics, frame-free checkpoint/model/query/hash behavior, and
provider process/lease/lock/cleanup behavior. Generic Git history is obtained
through the released source-inventory capability, not a second product discovery
engine.

The neutral resource and nested provider use the current resource/provider
law, non-Promise Habitat Effects, provider-owned normalized config, and cold
app-selected plans. The app/runtime harness owns process signals. Live substrate
proof must cover successful acquisition, typed failure/defect, prefix cleanup,
and release. Fluree is a concrete provider candidate, not generic query syntax
or session policy in the neutral API.

The proposed neutral/provider owners remain
`@habitat-ai/resource-temporal-inquiry` and
`provider-temporal-inquiry-fluree-http`; proposed SDK entry spelling is reviewed
on reactivation rather than asserted as currently exported. Qualify the current
native backend against the inquiry operations and histories it actually needs.
A D-1 merge failure does not automatically block an inquiry contract that does
not use merge, and inquiry proof does not establish D-1 conformance.

### Native Nx Projection

Preserve opt-in manifest discovery attached to the already existing owner
project/root, containment, immutable input hashing, provenance, and inertness
without that manifest. Mutable targets remain uncached. Native CLI Nx
init/remove are each idempotent: the first operation performs exactly its
admitted mutation and the second performs none.

No new project may be invented just to hold the projection. No direct consumer
script execution, public `apps/habitat` reexport, provider-private consumer
import, copied root metadata, legacy multi-package publication cohort, or
Codex/Claude transcript and `post-it.md` policy belongs in this generic owner.
Session policy is separately classified for Rawr; unclassified attestation
material remains held rather than deleted.

Preserve `@habitat-ai/resource-temporal-inquiry:test`,
`provider-temporal-inquiry-fluree-http:test`, and
`@habitat-ai/cli:acceptance:temporal-inquiry-nx`, plus real-substrate and
installed SDK proof. D-2 is accepted and released independently of the core
runtime; account for a CLI integration release if its Nx surface changes.

## D-3: Rawr Transfers

| Destination | Retained source intent | Actual prerequisite and acceptance |
|---|---|---|
| `services/workstream-frame` / `@rawr/workstream-frame` and `plugins/cli/topics/workstream` / `@rawr/plugin-workstream` | Product working-frame meaning, commands, and the reviewed semantic-ledger consumption contract from the mixed Fluree stack. | Accepted D-1 SDK release and only the runtime/service capabilities actually used. Re-author against the neutral released face, never direct Fluree or copied Habitat source. Run `@rawr/workstream-frame:test` and `nx run-many -t manifest,test -p @rawr/plugin-workstream`. |
| `services/research-experiment` / `@rawr/research-experiment` | Accepted research-experiment service design and unique product behavior, not the predecessor package-shaped runtime. | Released TypeBox/service law and required provider provisioning. No blanket D-1/D-2 gate. Run `@rawr/research-experiment:test` and current owner-local policy/type proof. |
| `services/session-intelligence` / `@rawr/session-intelligence` and `@rawr/plugin-session-tools` | Unique Session Metrics changes and generic-stack product session resolution not already in the accepted Rawr transfer. | Compare with current Rawr before transfer; consume an accepted inquiry release only if the selected behavior actually requires it. Preserve session/transcript/search/metrics and topic acceptance. |
| Existing Rawr corpus and research owners | Later genuine commands or domain behavior beyond the already recorded ChatGPT Corpus/Hyperresearch transfer. | Exact current-destination comparison, required released capabilities, service tests, and topic manifest/test proof. No production fixture command or backend selector returns. |
| Rawr owner-local governance references | Unique authority-freeze, toolbox, and design guidance after removing superseded Habitat-law copies from the adoption set. | Owner review and `rawr:check:governance`; these references are non-executable and need no ledger/runtime implementation release merely to be reviewed. |

The initial six-project Rawr adoption is already recorded at
`main@a1a4fe7ed051ff405605c82c09ccd73332595383` (PRs 57 and 59, SDK/CLI
`0.5.10`). That receipt is historical evidence, not a current destination
inventory or proof that the later held changes are redundant.

Each remaining sink needs its own immutable source record, current destination
comparison, owner acceptance, required exact published version/integrity, and
migration/installed behavior where applicable. Review-only reference transfers
do not inherit executable adoption gates. A mixed source stack is eligible for
retirement only after all retained destinations are accepted and its writer has
released the worktree. Completed runtime task 15.8 supplied this durable
disposition, not automatic adoption; the remaining transfers and held-source
retirement are not authorized by runtime publication.

## D-4: Native Agent And Desktop Hosts

Only native host integration is deferred. Completed runtime task 10.1 implemented
real agent authoring/executable/schema and desktop authoring/executable faces,
including descriptor to derivation to compilation to registry/process managed
Effect invocation proof, not empty exports or declaration-only stubs. The
web-local Effect face was implemented and qualified through tasks 14.1/14.2;
it is not part of D-4.

Preserve the canonical
[agent harness posture](../../system/HABITAT_ARCHITECTURE.md#135-agent-harness-posture),
[desktop harness posture](../../system/HABITAT_ARCHITECTURE.md#136-desktop-harness-posture),
and runtime realization
[agent/OpenShell](../../system/HABITAT_RUNTIME_REALIZATION.md#215-agentopenshell-harness)
and [desktop](../../system/HABITAT_RUNTIME_REALIZATION.md#216-desktop-harness)
contracts:

- The private agent and desktop harness owners consume
  `HarnessMountInput<MountReadySurfaceRuntimeRecord<AgentHostPayload>>` and its
  `DesktopHostPayload` counterpart. Inputs include process launch identity,
  bounded process access, required-resource readiness, report sink, and the
  applicable policy hooks or desktop host config. They do not re-derive authoring
  declarations or acquire providers.
- Agent plugins own channel/shell/tool projections and executable bodies;
  desktop plugins own menubar/window/background projections and executable
  bodies. Habitat owns compiled surface plans, adapter-lowered payload bridges,
  and invocation-time delegation to `ProcessExecutionRuntime`. The native host
  owns its native interior, not service truth or a second business execution
  plane. Durable desktop business execution remains on `async`.
- Each mounted native host returns one `NativeHarnessHandle`, not private
  `StartedHarness`, and truthful `HarnessHealthReport` values. Agent-tool
  invocation preserves `EffectBoundaryContext.traceId`; mount and policy
  failures become owner-local findings through mounting/observation, with no
  unredacted runtime internals or broad process-access escape.
- Select and qualify an actual third-party agent/OpenShell implementation and
  an actual desktop host before claiming support. The vendor choice is open;
  canonical OpenShell posture and interface requirements do not establish that
  any candidate is already qualified. Keep native security/policy enforcement
  inside its reserved boundary with the declared Habitat integration hooks.

Reactivation acceptance must exercise real native invoke, success, declared
failure, defect, cancellation, repeated/shared stop, resource readiness refusal,
and security/policy allow/refuse behavior. Prove bounded access, correlation and
redaction, truthful health/findings, native settlement before provider release,
and process-local isolation. Native host semantics must be researched and
preserved rather than replaced with a synthetic generic cancellation rule.

An owner-led host qualification records exact supported vendor artifacts,
platforms, installed/built acceptance, public integration scope, and a separate
accepted release. No current empty host target or fake qualification receipt is
required. This does not gate the qualified CLI/server/async/web core release
unless a selected required consumer demonstrates a real dependency and the
active scope is explicitly revised. D-4 is retained system ambition, not a claim
that native agent/desktop support has shipped.

## D-5: Full Observability

The Habitat telemetry resource/provider and native host owners retain this
work. Re-enter before enabling an external backend, claiming persisted/queryable
telemetry, or adopting semantic product events. The source-backed inputs are
recorded in [Backend Receipt Reuse](IMPLEMENTATION.md#backend-receipt-reuse);
the mixed telemetry worktree remains held and its staged changes remain owned.

Qualify real collector processing, ClickHouse/HyperDX storage and record queries
using uniquely identified events and an explicitly owned local fixture. Reuse
the existing digest-pinned Podman setup where appropriate, not the old fixture's
runtime implementation. Current native OTLP receiver receipts prove transport,
ancestry and finalization, not backend persistence.

Before external export, qualify a deliberate secret-bearing native exception
against a provider-owned sanitization policy. Preserve native errors and useful
trace identity; no claim that the present wire telemetry is universally
secret-free. Evaluate EVLog at native invocation/oRPC/Inngest attempt boundaries,
with service enrichment and one existing OpenTelemetry Logs pipeline. Do not
add a second exporter, provider bootstrap or shutdown owner. Any adopted event
semantics need their own outcome, correlation, failure and shutdown proof.

This is an unretired integration obligation, not permission to activate hosted
infrastructure or copy another owner's WIP. Generic runtime release does not
satisfy it; completed runtime task 15.1 audited existing receipts without
introducing this work.

## Reactivation Record

A reactivated capability must record its owner, exact preserved promises,
explicitly changed API/design choices with rationale, source and destination
revisions, current qualification evidence, actual dependency edges, named
acceptance receipts, and accepted integration release. Record excluded source
as excluded from adoption, not deleted, unless distinct deletion authorization
and preservation/ownership checks exist.

Until then D-1 through D-5 remain durable obligations with their source or
canonical-contract provenance.
Their unresolved work does not make completed generic runtime proof false, and
generic runtime release does not claim these integrations complete.
