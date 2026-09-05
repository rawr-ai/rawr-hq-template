# Habitat Runtime Implementation

Status: `active`; native web qualified; repaired CLI admission and task 12.1 locally qualified for candidate admission.
Branch: `agent-root-habitat-agent-plugin-runtime`, parent `agent-root-habitat-cli-admission`.
PR: cold predecessor [1008](https://github.com/rawr-ai/rawr-hq-template/pull/1008);
acquisition [1009](https://github.com/rawr-ai/rawr-hq-template/pull/1009).
Binding/execution [1010](https://github.com/rawr-ai/rawr-hq-template/pull/1010).
Cold adapters [1011](https://github.com/rawr-ai/rawr-hq-template/pull/1011).
Harness handoff [1012](https://github.com/rawr-ai/rawr-hq-template/pull/1012).
Observation [1013](https://github.com/rawr-ai/rawr-hq-template/pull/1013).
Mounting/startup [1014](https://github.com/rawr-ai/rawr-hq-template/pull/1014).
Oclif self-host [1015](https://github.com/rawr-ai/rawr-hq-template/pull/1015).
Qualified generators [1016](https://github.com/rawr-ai/rawr-hq-template/pull/1016).
Installed authoring [1017](https://github.com/rawr-ai/rawr-hq-template/pull/1017).
Native server [1018](https://github.com/rawr-ai/rawr-hq-template/pull/1018).
Native async [1019](https://github.com/rawr-ai/rawr-hq-template/pull/1019).
Built process isolation [1020](https://github.com/rawr-ai/rawr-hq-template/pull/1020).
Native CLI input admission [1023](https://github.com/rawr-ai/rawr-hq-template/pull/1023),
candidate `5a55fd5fa`, includes the qualified installed-test lifetime repair.
Workflow admission [1021](https://github.com/rawr-ai/rawr-hq-template/pull/1021),
candidate `66397039ebdb18f84dcd4b21b7a94194eb7374ff`, merged as
`18baa71dfbb6e62a3a0db98b619336e2a0ed1dce` on 2026-09-05.
Its required candidate and Linux/Windows installed checks passed; exact-main
Repository Ratchet [33985315987](https://github.com/rawr-ai/rawr-hq-template/actions/runs/33985315987)
passed. Graphite's native merge completed before the one consumed-branch sweep.
Native web [1022](https://github.com/rawr-ai/rawr-hq-template/pull/1022), candidate
`91d03dcbbfa54da030a0e8d21801333ca8e09b02`, has passed its required check
[33988159150](https://github.com/rawr-ai/rawr-hq-template/actions/runs/33988159150)
and Linux/Windows installed checks in
[33988159166](https://github.com/rawr-ai/rawr-hq-template/actions/runs/33988159166).
The first candidate's Windows failure exposed missing runtime-harnesses LF
attributes: exact LF/CRLF hashes reproduced its expected/received immutable
proof values. The repaired parent adds the existing `text eol=lf` policy for
that family without changing any historical file or hash. A real
`core.autocrlf=true` checkout preserves all 13 tracked harness blueprint files
byte-for-byte, and the repaired parent passes `bun run check`. This is a
qualified repair. The repaired candidate's first Windows run then exceeded the
job deadline without an assertion failure; its exact-job diagnostic retry
passed on the same SHA. No timeout increase was needed. Native web remains
unmerged while its dependent stack is qualified.

The CLI admission candidate passed required/Linux checks but failed its broad
Windows installed test at the test deadline, then hit an EBUSY teardown because
timed-out commands were not joined. Repair the test boundary, not the product:
split the 23 native scenarios into named cases, bind children to Vitest's public
test signal, and join exact owned process-tree termination before fixture
removal. That one-file repair is backported to the CLI admission node and passes
all 33 installed tests plus app test TypeScript. Graphite restacked task 12.1;
its resolved tree is byte-identical to the fully qualified integration tree.
Remote Windows qualification of the repaired candidate remains required.
Commit: see Git history; accepted opening main `80c19fc1291515acbf21e88c97385d5e29d74341`.
DRA: Codex, owner-delegated Product/Development lead.
Opened: 2026-09-04.

This record continues the admitted [realignment](WORKSTREAM.md). It owns
execution continuity and review disposition, not another specification or queue.

## Frame

The owner has now authorized implementation through every complete capability
that can be defended from current authority and native evidence. The previous
preparation-only boundary has ended; its historical outcome remains unchanged.
The [frame](FRAME.md) and accepted [decisions](decisions.md) still govern the
target. The active [OpenSpec tasks](../../../openspec/changes/realize-app-runtime-spine/tasks.md)
remain the one execution sequence.

Containment: Habitat's meaning-preserving cold pipeline, process provisioning,
binding/execution, mounting/observation and native runtime acceptance. Proceed
through actual dependencies, not an arbitrary task count. A complete story
must advance an operating capability and land with its real tests and law.

Non-goals: product implementation in Civ7, Magic or Rawr; restoring rejected or
held WIP; external database distribution maintenance; hosted infrastructure
changes; global model/configuration churn; historical stack cleanup. Release
remains subject to the existing exact-main and installed/native evidence gates.

The owner's later telemetry continuation authorizes using the existing local
OpenTelemetry/HyperDX/ClickHouse setup for real receiver verification. Inspect
its actual ownership and startup route first; this does not authorize changing
hosted production infrastructure. The subsequent clarification delegates the
proof choice rather than requiring containers now. Use the real container-free
OTLP receiver for ordinary acquisition CI; collector processing, persistence
and queryability need a separate backend qualification at the full observability
boundary. Do not claim the former proves the latter or make Podman startup a
new substrate prerequisite. Confirm EVLog's current role from its owning
specification before integrating it.

The owner approves this phased proof policy across infrastructure providers:
prefer the lightest real, offline/container-free boundary that proves the
current claim; de-risk an uncertain native behavior early rather than defer a
load-bearing question. Full collector/storage, host and async integration retain
their actual native acceptance gates. For Inngest, inspect Magic's existing
local-development/production setup as reference, never as inherited correctness
or permission to copy product wiring. Local development-server evidence is not
production acceptance, and a mock cannot prove native retry, replay or
cancellation semantics.

Stopping rule: ordinary defects, failed tests and missing vendor knowledge feed
research, design and repair loops. Escalate only an unresolved material product
direction, ownership conflict or new external operating commitment that cannot
be resolved from the authorized frame. Never call a partial story complete.

## Opening Packet

Current domino: task 12.1's complete agent-plugin lifecycle integration. Its
native input-admission prerequisite is locally qualified and submitted; the
following admission decisions remain its accepted contract.

Owner continuation on 2026-09-05 requests an explicit ownership check: verify
that the service implements generic Habitat packaging/native lifecycle and
versioned-data validation, not Marketplace membership or release decisions.
The existing repository split assigns the generic service to Habitat, but the
actual behavior must support that assignment. The admission steward reviews
that boundary before app wiring. Compare service authorship with the accepted
design and Magic's reference where useful. Fix clear substrate-induced defects;
defer ordinary internal rearrangements unless they impede the current story.

Accepted integration refinements: process catalogs explicitly declare process
resource requirements, while profiles remain provider-supply candidates. Native
telemetry belongs to that process requirement, not a fake service/plugin
dependency. Expose the existing exact cold telemetry resource/provider through
the SDK's current assembly, without a reverse dependency or duplicate identity.

Native CLI admission owns flags, modes, scalar adaptation and bounded input
transport. Aggregate domain/schema validation remains with the service before
domain-port methods, not a new parsed-input hook. Preserve release-input typed
UTF-8/JSON/canonicality failures and distinguish resource construction from
resource operations in the inherited specification. Only JSON is a universal
command flag: mutation controls belong to commands that actually implement
them. Existing authoring commands already declare their own dry-run behavior.

The qualified input-admission prerequisite repaired eager startup rather than
weakening native refusal. It is an app-owned lifecycle repair, not a new runtime owner.

Accepted design: `host.execute/run` receives a startup thunk. Native Oclif owns
discovery, the selected Command and exactly one parse. Its Args/Flags custom
parsers and flag relationships own scalar/mode/input admission;
the existing SDK companion preserves them without a second DSL. The admitted
binding invokes startup once, mount validates exact compiled source/ref identity,
then the command body runs. Help, external commands and refused first-party
inputs do not acquire Habitat resources. Cold app/provider declarations and
native discovery are allowed; no live acquisition or domain I/O precedes input
admission. Canonical stdin uses bounded invocation-local bytes, not Oclif's
trimmed, process-cached convenience stdin value.

Discovery and parsing belong to the outer native invocation. Failed startup
must not stop a harness by awaiting the Command that awaits that startup.
After activation, preserve command/finally/flush before process release. A signal
during gated acquisition is retained until acquisition settles and mount can
refuse with rollback; the current SDK has no acquisition-abort option, so do not
claim immediate interruption. Tests extend the existing built/installed native
matrix with zero-acquisition refusals and gated startup failure/cancellation.

Independent review also caught pre-admission signal suppression: a custom native
parser waiting on open stdin cannot consume the managed execution signal. The
accepted repair installs Habitat's signal handlers only after native parsing,
at admitted first-party binding and before startup. Discovery, parsing and
external commands retain native signal behavior. Do not race and abandon a
parser, destroy global stdin or force exit to imitate managed cancellation.

The real manifest gate invalidated an initially proposed `Command.constraints`
projection. In pinned core 4.13.3 / oclif 4.23.29, native constraint instances are
cyclic and the native command cache serializes them. A nonenumerable property
avoids serialization but also silently skips validation through the native
parser's options spread. No compatibility shim is accepted. Native conditional
flag relationships passed manifest, exact loaded class identity and actual
refusal/success controls; they supply the needed modes with no new SDK API.
Reconsider the separate constraints field only after a qualified vendor fix.

The runtime peer owns app host lifecycle; the admission peer owns native matrix
evidence; root owns the small SDK metadata face, authority and integrated gates.
The independent service peer investigates task 12.1's retained Clock/Logger/
Analytics ports, without adding no-op adapters or service-side Effect terminals.

That review found no domain consumer of the mandatory Logger/Analytics ports or
synthetic invocation trace/command fields: the two root middleware wrappers only
duplicate generic procedure outcomes. The next service repair removes those
requirements rather than inventing telemetry adapters. Native runtime/oRPC
tracing remains; this does not claim equivalent product analytics or Effect log
export. Parse refusals acquire no telemetry; admitted domain refusals retain
actual process correlation. ClockPort has one real consumer, vendor provenance
time, and can use native Effect Clock at that exact operation with a test Clock.

The existing native-provider contract genuinely distinguishes Codex and Claude.
Use their separate typed runtime resource identities and existing provider
owners, assembling only the established two-member catalog in the sealed
service constructor. No composite provider owner, new instance selector or
pre-acquired provider home is needed. Removing unused root middleware also
exposes a false service@3 requirement for an unused native base author: a complete
immutable service@4 successor should allow omission while still validating any
present native author and all five context lanes. Keep predecessors unchanged.
Provider interruption needs native qualification: content-workspace's current
execFile finalizer sends SIGTERM without awaiting close, unlike the scoped
Effect process precedent. Runtime wrappers alone cannot qualify its shutdown.

Task 12.1 implementation now selects all six native commands and the existing
five provider factories through one managed service. Process-level resource
requirements carry telemetry demand without granting plugin access. The service
uses native Effect Clock only when capturing materialized vendor provenance;
unused logger/analytics ports and duplicate middleware are removed. A complete
immutable service@4 permits omission of an unused base author, but validates
every present author and preserves the context lanes. Historical versions stay
unchanged. The declared `.habitat/release-input.json` and
`.habitat/agent-plugin-lifecycle/channels/current-main.json` interfaces replace
the obsolete service paths without fallback. Marketplace adoption is not claimed.

The content-workspace Git resource now uses the pinned native Effect Platform
scoped child process rather than an execFile finalizer that returned before
termination. The real interruption discriminator waits for native exit and
checks a stopped heartbeat; this does not promise arbitrary launcher-descendant
ownership. Installed ordinary acceptance already proves connected OTLP ancestry
from Oclif through runtime execution, official oRPC and the service operation,
including finally/flush before export and fresh process identity. The full
native gate additionally uses explicit Codex/Claude executables and disposable
Git/native homes. The complete installed run passes all 35 tests with native
qualification enabled. Its 21 native command invocations cover all six commands,
exact mutation prefixes, native inventories, package bytes, converged zero-mutation
repeats, vendor source refusal without fetching, and connected OTLP ancestry.
Codex 0.153.2 and Claude 2.1.220 use explicitly selected executables and disposable
homes; this is local POSIX qualification, not Windows native-provider or backend
storage acceptance. The separate named native-telemetry target also passes.

Full repository CI passes 172 tasks across 36 projects. App test types, strict
OpenSpec validation and diff hygiene pass. Independent service/API, native
lifecycle and input-admission review has no remaining P1/P2 finding. The complete
gate exposed stale exact manifest/export inventories and tests expecting eager
process configuration; those oracles now match the selected commands and proven
lazy admission contract without relaxing their checks. The installed fixture now
owns timed-out commands and receiver cleanup through Vitest's public test signal,
joins termination before removal, and tests native scenarios independently rather
than inflating deadlines. Task 12.1 is satisfied locally; candidate and exact-main
admission remain separate gates. The predecessor receives only its narrow test
cleanup/scenario-split repair before stack submission.

Tasks 14.1/14.2 are locally qualified and submitted: native web build/mount
handoff and request-time web-local Effect execution. The accepted design below
separates native module loading from actual managed execution. It is not a
product web app, browser managed runtime, router framework or general SSR platform.

Task 13.7, explicit server-only workflow event admission, is merged and exact-main
verified. Its native send boundary adds no workflow engine, generic event
bus or provider lifecycle.

The qualified predecessor is task 13.5, independently built same-app children through an
ordinary packed SDK. One app and finite process catalog select separate thin
server and async entrypoints; the test driver is not a production supervisor.
Prove actual operations, independent stop/restart and leases, failed acquisition
with nonempty rollback before mount, and exact process-local health/identity.
Its candidate `0290cd07bc3a0c4b1cc1218d072fdc1f5006744d` merged in PR 1020;
exact main is `46bb598f865069c4c600b96c4a7928ad3bb8f8da`.

The accepted local predecessor is tasks 13.3/13.4 together, complete native Inngest Serve/Connect
qualification.
The cold peer owns async authoring and selected source preservation; the runtime
peer owns native callback/step execution and host lifecycle. Root owns terminal
SDK, policy, packaging, complete native acceptance and design disposition.

Native SDK 4.18.0, Bun 1.3.14 and disposable Dev Server 1.44.0 are the qualified
local probe cohort. Keep actual native orchestration and predeclared step
membership distinct: preserve the authored outer `run(ctx)`, never execute or
parse it for discovery, and never infer sequence from the membership array.
Workflows explicitly author `eventName`; native event fan-out is allowed and
does not promise exclusive workflow targeting. Standard native JSON step
results, including void-to-null and Date-to-string, use Inngest's own `Jsonify`
type rather than type-fest or another serializer. JSON-preserving middleware
is admitted; profile-selected output codecs cannot change static author types
without a later explicit result-codec contract.

Outer context retains native orchestration tools and schema-decoded event data,
plus a private invocation-bound bridge. It receives no service/resource/runtime
bag. Exact declared descriptors lower once through the existing private source
handoff. Only an actual `step.run` callback enters process execution and receives
its bounded capabilities. Reuse existing process invocation leases to preserve
already-admitted sequential steps through shutdown; no synthetic async signal.

Review resolved an inherited service-lane contradiction: the old async example
promised invocation-bound service clients without any authored source or mapping
for their service-owned invocation schemas. Two selected services can require
unrelated actor, tenant, or audit inputs; neither execution identity nor event
data can supply those implicitly. Async step bodies therefore use the same
construction-bound clients and explicit `withInvocation(...)` as other managed
contexts. This removes an unsupported special case rather than adding a new
mapper API. The private native step capability remains invocation-bound, and
service validation and descendant lifetime ownership remain unchanged.

Harness config names an existing process resource and optional instance; mount
resolves the exact native client and supplies it to both registration and the
selected native host. The conformance fixture authors its real client provider
through existing SDK contracts; a new generic production provider is not needed
merely to prove this host boundary. Serve owns its listener and admitted handler
Promises. Connect keeps the native worker-thread default, pins that mode in its
acceptance, and disables native process signal handlers. Native close and
callback drain precede provider release; neither implies event delivery. Do not
register the same native app simultaneously through Serve and Connect.

The real probe already distinguishes Serve checkpoint modes and native history
query shapes. Completed steps are memoized; failed attempts re-enter. Native
run cancellation changes run status while an active callback continues, and late
callback history may still arrive. Those facts qualify local behavior, not
Cloud, delivery, process resumption or synthetic cancellation. The complete
Habitat fixture must reproduce these guarantees through the actual owners.

The accepted server packet: tasks 13.1/13.2 together, complete native Elysia/oRPC server
qualification, including the owning native telemetry gate. Root owns terminal
SDK assembly, authority/law, packaging and composed acceptance; the runtime
peer owns selected cold server references and process-owned native request
assembly; the native peer owns Elysia lifecycle and host proofs. The cold peer
independently reviews the complete path. Tasks 12.1/12.2, async and web remain
separate capabilities, not prerequisites for this server story.

The existing explicit descriptor registration remains the only representation.
A narrow `@habitat-ai/sdk/runtime/harnesses/elysia` facade delegates a cold
descriptor factory to its private owner; the generic harness face stays
type-only. No SDK host-selection enum or hidden harness registry is added.
The factory neither imports Elysia nor listens. Selected mount conditionally
loads exact Elysia 1.4.30; Bun 1.3.14, oRPC beta.32 and Effect beta.101 stay
unchanged. Native scratch proof verifies graceful stop retains a gated request,
refuses a fresh connection and receives actual client abort on Request.signal.
Only the composed fixture can prove native operation and resource ordering.

Retain exact selected api/internal factory references and routeBase in the
existing private derivation/compiler handoff. Invoke them only during live
lowering. Native oRPC handlers receive process-owned request admission and
bounded invocation clients; they never enter ProcessExecutionRuntime. The host
receives lowered callbacks and public contract projections, not the app, plugin
graph, raw managed runtime or provisioning values.

One explicitly configured document path serves the combined selected public
OpenAPI projection using native oRPC contract/path/generator facilities.
Internal RPC stays excluded. Reject actual colliding method/path ownership
before listening; equal routeBase alone is not a collision. Multiple descriptors
for one surface explicitly replicate selected payloads; they do not introduce
capability partitioning. Cohosting API/internal registers the same descriptor
object twice and produces one mount and one owner-local native stop.
Cross-public overlap uses the already-pinned native rou3 0.9.1 overlap API with
oRPC's native parameter projection, now declared as a direct dependency rather
than borrowed transitively. Concrete internal RPC paths use native matching,
preserving all admitted methods and literal stars. Habitat adds no router or
path-intersection engine. Native regex intersections can be conservative;
admission refuses unresolved overlap rather than asserting exact disjointness.

Server-native telemetry acceptance must co-land real native outcomes and
correlation, not be left for task 15's audit. Ordinary CI uses real local OTLP
receipt. The stronger collector persistence/query receipt and EVLog event
cardinality remain named, unretired observability obligations until separately
qualified against the existing local backend. The held implementation's old
deadline-release behavior and beta.23 pins are not adoption authority.
The native harness test depends on the complete server-native-telemetry target,
so the real container-free fixture runs in the ordinary repository CI graph.

The accepted task 12.3 underneath retains these contracts:

The app injects two stateless native runner functions into the topic's existing
SDK factory option contract. Each CLI-owned runner reads the operator's current
directory once at invocation and passes that exact root to native FsTree. It
does not search parents, use the installed package root, retain mutable state,
or confuse source-authoring cwd with the catalog reader's separately supplied
workspace root. No SDK context extension, new resource/service, app reconstruction,
nested Nx subprocess or replacement filesystem transaction is warranted.

The accepted refinement follows the official Nx Tree contract and pinned
23.1.1's `generate.js`/`tree.js`, with a real disk-failure regression. Each native
entrypoint returns void, computes its own qualified plan and delegates only
kind-agnostic containment, preimages, exact-byte comparison and Tree staging.
Nx owns dry-run and disk publication; no install callback or invented rollback
owner is admitted. The updated qualified-artifact-authoring specification is
explicit about the remaining native disk-failure boundary. Generator discovery
uses two distinct schemas/entries. Native source metadata and topic membership,
not generated manifest edits, determine official command discovery.

The accepted self-host underneath retains these contracts:

Keep native Args/Flags, parsing, command classes, dispatch and external-plugin
loading. A typed CLI companion creates one SDK command Effect descriptor and
retains topic-owned native presentation separately from its product result.
Cold explicit discovery consumes selected public derivation source references;
live mounting exact-matches them to compiler-selected lowered callbacks. This
distinguishes static manifest inventory from live authority without a second
selector or public compiler. Native run, root finally and awaited flush settle
before stop and native error handling. The Nx reader uses that same bounded
native path without terminal presentation or process exit, never an escaped client.

The filesystem resource pairs native filesystem capability with its host-compatible
path semantics. It is not a platform service bag or a separate path lifecycle.
Git/Grit and filesystem providers capture stateless native capabilities once at
acquisition; actual operations retain native scoped handle cleanup. Retire SDK
catalog/provider imports atomically, then bundle those selected private owners
in the CLI distribution while leaving the public SDK external and singular.
The catalog's explicit ready-dependency Promise helper remains a permitted
unmanaged public face; the managed self-host uses only its complete runtime export.

`startApp` consumes the exact entrypoint and requires explicit source inputs,
finite native integration registrations and `waitForNativeStop` deadline policy.
Registrations resolve already-selected harness IDs; they cannot add roles or
reselect a process. Only currently implemented surface adapters are admitted.
Validate all registration coverage before acquisition. Keep lowered record types
public through the type-only harness face, not compiler plans or adapters.

Start success means native mounts completed, not fabricated passing health.
Required resource evidence gates mounting; optional distinct health probes run
only on explicit queries. All selected harness contributions remain unknown
until valid evidence, with explicit not-applicable neutral. Native stop owns
settlement of its probes and report producers too. One process-local stop closes
admission synchronously, waits for reverse-order native settlement, then stops
the process. Its deadline reports pending native work without releasing resources
or resolving early. No whole-app controller, force-stop policy or health poller.

The observation-owned initial seed contains complete selected topology adapted
by the SDK from real compilation outputs. Known topology is not empty merely
because execution has not begun; live execution/mount/stop histories remain
unobserved until actual admitted records arrive. Fixed safe payload projections
and omission of unsupported payloads precede any future configurable redaction
or storage system. Use immutable snapshots and bounded process-local histories
with visible dropped counts, not an unbounded event ledger. Publication and
telemetry sink failures cannot alter product results or runtime authority.

Handoff PR 1012 is locally accepted and submitted. Graphite's one native merge
job completed PRs 1008-1011. Exact main
`57557acfb6a3f94e05195d541c3be1677f121cbe` passed Repository Ratchet 33950917970.
The single `gt sync --force --no-restack --no-interactive` sweep has removed all
four consumed branches, followed by a targeted observation-child restack. The
restack produced an identical tree. Graphite skipped occupied held worktrees;
their heads and telemetry's eight staged files are preserved. Observation is
submitted as PR 1013; no release or native-host qualification is implied.

The owner's September 4 continuation delegates scope, execution and stopping
point, requests perspective-specific standing peer review, and authorizes
Astra model selection by concern. Preparation PR 1007 is merged; its exact-main
Repository Ratchet run 33927346930 passed at the opening revision above.

Authority order: current owner intent; canonical architecture/runtime and
Habitat ontology; named OpenSpec amendments/sequence; pinned vendor mechanics;
current source/tests as behavior evidence; dated and consumer material as
non-authoritative needs/provenance.

Relevant first owners are `runtime-definition`, `runtime-derivation`,
`runtime-compiler`, their terminal SDK consumers and then `runtime-bootgraph`.
The primary checkout's untracked `.codex/config.toml` and all held worktrees
are preexisting owner state, not this workstream's cleanup scope.

## Team And Review Loops

Root owns implementation decisions, synthesis, integration, proof claims and
Graphite admission. Independent peers may challenge the handoff; delegation
does not make their findings or the root's first proposal semantic authority.

| Concern | Accountable role | Model posture | Boundary |
| --- | --- | --- | --- |
| Product and integration | Root DRA | Parent model | Source, disposition, admission |
| Cold semantic oversight | `cold_contracts` | Astra High | Read-only contract and composed-code review |
| Derivation implementation | `runtime_supervisor`, explicitly reassigned after opening review | Astra Max | Derivation source/tests; never self-approves closure |
| Definition and SDK authoring | `team_setup` | Astra Medium | Complete export, type proof, terminal projection and minimal role configuration |
| Native vendor integration | Reused bounded specialist at each touched vendor | Astra High or Max for uncertain mechanics | Pinned source, native proof, no replacement engine |
| Proof and closure | Existing proof-ledger/closure stewards at material gates | Astra High or Max | Independent claim and completed-state audit |

Use explicit per-invocation model/effort selection. `low` is the supported
quick-research effort corresponding to the owner's informal "Light" request.
Standing roles mean reusable responsibilities and review continuity, not
background tasks or a new scheduler. Spawn only bounded briefs with no inherited
full history. Existing repository hooks remain active.

The host limits total agent threads and the explorer role is read-only. After
its independent opening pass, `runtime_supervisor` therefore hands cold
oversight to `cold_contracts` and accepts the disjoint derivation write set.
This is an explicit role transition, not supervisor edits under review authority.
Existing tracked designer/engineer role defaults move from Sol/high to
Astra/max and Astra/medium respectively; their role instructions stay intact.
The preexisting Fluree config is untouched. Current per-spawn selection works
without restart; future repository-local role discovery is not claimed hot-reloaded.

At each boundary-changing story: establish the complete data/ownership contract;
implement with disjoint write sets; run owner behavior/type/build/policy checks;
review architecture, structural quality, TypeScript and behavior; add vendor
review only at a touched native boundary; repair and re-review affected lanes;
then admit through Graphite and required CI. Accepted P1/P2 findings block
dependent closure until repaired or explicitly dispositioned with evidence.

TypeScript review should consider `type-fest` before adding a custom structural
type helper. Use it when its pinned semantics simplify a real contract; do not
add an unused dependency or confuse type-only helpers with runtime operations
such as `node:util.isDeepStrictEqual`. This captures the owner's continuation
note without creating another prerequisite or requiring blanket substitution.

Keep this machinery proportional to the current complete, testable advance.
The workstream is the iterative collaboration and feedback loop, not a ledger
production exercise: retain consequential decisions, unresolved inputs and
trustworthy evidence; let tests, Git and native tools carry mechanical detail.
Do not expand a phase merely to maximize coverage or documentation. Apply
requisite variety within the phase as well as across the platform.

## Workflow And Output Contract

First story is all of task 0.1: complete cold service references, named slots
and instances, selected-process normalization/coverage, ordered source policy,
cohesive compiler handoff, bounded DAG work and valid identity encoding. No
provider build, constructor, descriptor body, loader or acquire runs cold.
Then 0.2 removes the hostile-object bootgraph protocol while preserving graph
integrity and deterministic reverse lifetime order. Continue into provisioning
and live runtime only after those predecessor contracts are actually verified.

Required outputs: functioning source, discriminating regressions, conforming
owner law and routing, native evidence at native boundaries, current task state,
dispositioned review, exact repository admission and a concrete continuation.
Defined, implemented, verified, installed, released and consumer-accepted remain
different evidence classes.

Scratch stays in the initiating task's `work/`; only curated records enter this
repository. All edits use the isolated worktree and absolute patch paths.
No global restack, broad source restoration or unrelated cleanup is authorized.
The owner's Graphite correction is adopted in the canonical stack runbook:
publish and request the native stack merge, wait for actual completion, then
one `gt sync --force --no-restack --no-interactive` sweep of consumed branches.
This is not a per-branch drain algorithm. Protect held work before the forced
sync; required checks and exact-main receipts remain separate proof.
`gt upgrade --no-interactive` confirms the installed CLI is current at 1.8.6.

## Current State

The cold pipeline, bootgraph simplification, native acquisition, service
binding/execution and cold adapters are now landed through PRs 1008-1011 on
the exact accepted main above. Graphite automatically updated the submitted
handoff child's remote base. This is source admission, not a package release
or consumer acceptance. Earlier candidate receipts below retain their original
meaning and revision.

Cold pipeline and bootgraph source have passed independent review with no
remaining P1/P2. Packed SDK/CLI installed acceptance passed all nine tests,
including the real native service export, callable and declaration checks.
The complete candidate CI command passed. PR 1008 now includes the Windows
declaration-resolution correction at `ddefa31e3decd2c502a45bd8ff12000f120401a8`.
Required CI and both Linux/Windows installed acceptance passed again (Repository
Ratchet 33939076263, installed-package run 33939076218). Acquisition PR 1009 is
also green at `2e394920a`: required run 33942339473 and Linux/Windows installed
run 33942339472 passed. Binding/execution continues on its child branch. This is
working-stack progress, not a claim that either story has merged or released.

### Accepted Local Domino: Native Acquisition

Task 7 owns a complete compiled-plan-to-ready-process story: source availability
and selected schema preflight; exact dependency-resource lookup; one native
Effect lifecycle adapter and managed runtime; acquisition, rollback and release;
then the private ready-process artifact. It does not bind services or mount a
host. Root owns consumed-artifact admission, config, maps and integration;
`runtime_supervisor` owns native policy/lifecycle; `team_setup` owns co-active
owner law and checks; `cold_contracts` independently reviews semantics and
native evidence. No writer approves its own outcome.

The reserved loader interiors now have a concrete implementation decision:
explicit launcher-supplied app root; one env snapshot and optional private
memory/test records; UTF-8 JSON top-level objects for `file`; a shared pinned
dotenv parser, with complete syntax admission rather than silent junk skipping,
for `dotenv`. Preserve multiline quotes and exact literal keys. Neither native
`parseEnv` nor Effect ConfigProvider is a suitable substitute: the former
differs between Node/Bun, and the latter introduces path/value semantics.
Decoded values and resource selections remain in private process state, not
portable plans or observations. One native Context entry carries ready values;
providers and domain services do not become a Layer graph.

Native provisioning is implemented and independently reviewed. Real file leases
prove distinct OS-process ownership and cohost reuse. Preflight and lifecycle
tests cover exact-key refusal, rollback, late acquisition under timeout,
deferred release throws and continued reverse cleanup. The selected-process
config discriminator also passes: unused async-only provider configuration is
inert in a server process, but required before acquisition when that async
process is selected. Thirteen SDK provisioning integration tests pass. Native
value fusion passed the complete rebuilt repository CI (123 tasks, 27 projects)
and all nine macOS installed-package tests. The final installed rerun also
proves the resource@3 error law rejects an invalid failure channel in an optional
root helper. Independent acquisition, native Effect, telemetry and law reviews
have no unresolved P1/P2. Tasks 7.1-7.5 are locally accepted and required remote
checks passed; native stack merge remains pending. These are not
service-binding, native-host or release receipts.

Role visibility and lifetime are independent: the process projection contains
process-lifetime values; each selected role projection contains unqualified
values or values qualified for that role. These private readiness projections
reuse acquired values. Consumer-bounded access belongs to task 8.1.

The resource/provider-owned private telemetry adapter now conforms to
`RuntimeProvider`/`ProviderEffectPlan` and passes three real SDK pipeline tests:
enabled acquisition and OTLP HTTP receipt, cohost reuse, duplicate degradation,
fresh reacquisition, rollback after a later provider fails, and disabled behavior.
Its native lease stays private and its explicit monotonic deadline is sampled
only at finalization. This is private source assembly, not a public provider
export. Existing native package exports remain unchanged so they cannot bundle
a second definition witness. A complete resource@3 law successor admits the
neutral identity/helper source without mutating resource@2.

The first HTTP test exposed a preexisting native-provider bug: frozen headers
prevented the pinned OTLP transport from adding `User-Agent`, so no request was
sent. The provider now supplies a fresh mutable header copy per send, preserving
authored configuration. Native tests and independent review pass after repair.
HyperDX/ClickHouse record-query proof is a stronger, separate receipt for the
full observability boundary; local HTTP receipt does not satisfy it. Existing
infrastructure is being located for reuse, not made a new task-7 dependency.

## Findings And Verification

Do not infer runtime acceptance from the preparation's green tests. Exact
commands/results are recorded as run; in-progress failures are not waivers.

### I-01 - Preserve Absent Lanes And Public Generic Meaning

Severity: P2. Source: independent `cold_contracts` definition review.
Disposition: repaired; independent type probe and integrated cold gates passed.
The first constructor typing required absent scope/config lanes as `unknown`
and accepted invented invocation data. Canonical section 11.3 instead requires
no synthesized invocation when no schema exists. Preserve absence in inferred
declarations, allow omitted/undefined-only absent values, and require exact
schema output for present lanes. The root's brief saying "unknown otherwise"
was imprecise and is corrected by the canonical contract. Preserve public
`ServiceUse<TContract>` and existing declaration-oriented `ServiceOf` usage
rather than creating an unrelated generic compatibility break.

### I-03 - Admit The Actual Consumed Cold Contracts

Severity: P2. Source: independent compiler corruption probes.
Disposition: repaired with discriminating regressions.
Compiler admission now requires a callable selected provider `build`, checks
the existing closed execution-policy schema before recursive data copying,
and shares derivation's admitted descriptor-to-surface relation. Missing or
non-callable build, a real authored cyclic retry delay, a rehashed server/API
surface carrying an async reference, and a schedule reference on a workflow
surface all refuse with `TypeError` and no cold executable calls. This adds
ordinary consumed-contract checks, not a hostile-object inspection protocol
or another walk of authored plugin trees.

### I-04 - Keep Nominal Declaration Identity At Its Owner

Severity: P2. Source: composed compiler source/test typecheck.
Disposition: repaired; integrated source/test typecheck and builds passed.
The existing private tsdown bundles copied definition-owned unique symbols
into derivation declarations, making genuinely typed producer/consumer
values incompatible. Declaration-only `deps.dts.neverBundle` retains upstream
private owner imports and existing vendor externalization. JavaScript and the
terminal SDK source bundle remain unchanged; no witness was weakened, cast
away or redefined. Rebuilt derivation declarations import the exact upstream
types and no longer redeclare their symbols.

### I-05 - Retain The Selected Process Harness

Severity: P2. Source: composed independent cold review.
Disposition: repaired with producer and compiler regressions.
Moving normalization to derivation initially lost the selected process harness.
The private handoff now retains the sorted unique union of profile and process
harnesses; profile inspection still shows only its own declarations. Process-only,
distinct-union and shared-id cases pass without asking compilation to recover
authoring inputs.

### I-02 - Release Callback Throws Are A Real Native Hazard

Severity: P2. Source: pinned beta.101 source and native in-memory supervisor probes.
Disposition: repaired in 7.2/7.3 and independently verified; not a cold-story defect.
`ManagedRuntime.make` owns its scopes and lazy build fiber; force `context()`
and dispose failed startup. Native `Effect.acquireRelease` registers release
only after success. A returned defect Effect permits earlier finalizers, but
a synchronous throw while constructing the release Effect can skip them. The
one substrate adapter must defer callback invocation inside the registered
Effect and observe defects while continuing native finalization. Do not add a
second finalizer registry. Native-value fusion also requires validating the
release callback's returned value inside that deferred boundary: malformed
JavaScript returns otherwise escape native finalization and skip earlier
releases. Undefined, object and number regressions now observe one bounded
defect and continue reverse cleanup; independent review passed. Native repeated
disposal is not by itself the later
shared in-flight process stop operation.

### I-06 - Windows Paths Are Not Package Names

Severity: P1. Source: actual Windows installed acceptance for PR 1008.
Disposition: corrected on the cold predecessor; the Windows rerun passed.
The declaration externalization regex treated absolute Windows drive paths as
package names, causing missing-export build errors. Derivation, compiler and
bootgraph now distinguish drive/UNC/absolute/relative/virtual IDs from package
specifiers. The new substrate uses the same corrected predicate. Linux success
did not waive the Windows failure.

### I-07 - Compose Native Effect Values, Not A Second Algebra

Severity: P1 for downstream composition. Source: task 8 boundary review and
exact beta.101/beta.23 native probes; owner continuation explicitly delegates
the complete investigation and simplification decision.
Decision: retain the curated SDK authoring surface and private nominal provider
plan, but use native Effect values. The former custom value/interpreter cannot
compose with the native Effects returned by service clients or existing resource
operations. Both representations are cold; portable plans contain references,
not either program representation. A second algebra therefore supplies no
needed lifecycle or portability guarantee and adds an unnecessary integration
protocol. Canonical section 9.1 now governs this refinement.

Keep one native `acquireRelease` and one managed runtime. Native default masking
protects successful-acquire registration; deliberately interruptible acquisition
retains native behavior and leaves partial/unreturned work with its provider.
Do not preserve our initial AST-wide interruption suppression by introducing a
hidden fiber or rewriting native programs. Focused native tests now prove both
cases, including late default acquisition under timeout. Provider plan identity,
infallible release typing, exact config/maps, source coldness and public terminal
exclusion remain required. The full rebuilt `bun run ci` gate passed after
fusion, then passed again with qualified telemetry and resource@3: 27 projects,
123 tasks, 52 cache hits in the final composed run. Strict OpenSpec validation
and the seven-test cumulative product-separation proof passed. All nine macOS
installed tests passed with native fusion and resource@3; the final added
root-helper negative source-law discriminator is being rerun separately.

Independent task-7 review found 7.1/7.2/7.3/7.5 semantically complete, with 7.4's
telemetry integration remaining. The substrate is presently consumed by SDK
test source, not public runtime assembly. When task 8 activates its production
consumer, SDK packaging must declare and externalize `dotenv`; current packed
SDK tests do not claim installed provisioning.

The same review found that official beta.23 native clients return Promises.
A managed Effect client must be a real lazy native-boundary adapter, not an
alias or private router executor. Cancellation must await that request's actual
settlement before process resource release. New official beta.32 provides
`createEffectClient`; its applicability is under exact-tuple investigation
before implementing a replacement. Exact isolated beta.32/beta.101 qualification
has passed a native client/handler/context/middleware/error and cancellation-drain
fixture. The next service-binding story will coherently upgrade the official
oRPC family and reuse its client with process-owned request admission/settlement
tracking. The existing official runner is unchanged between those pins. The
community bridge is not added alongside it; current acquisition dependencies
have not yet changed.

The [official beta.32 release](https://github.com/middleapi/orpc/releases/tag/v2.0.0-beta.32)
and [client source](https://raw.githubusercontent.com/middleapi/orpc/v2.0.0-beta.32/packages/effect/src/client.ts)
establish the new native API. A further isolated strict TypeScript/Bun probe
passed a single process-supplied client-assembly capability: the service keeps
its router private in a native client factory, while process runtime supplies
context/wrap and interceptors and applies vendor `createEffectClient`. Two
interleaved invocation views and repeated use of one view retain typed results
and fresh per-call context. This is design evidence for task 8, not implemented
binding or a new public API receipt.

Opening proof: PR 1007 merged at the exact baseline; main CI run 33927346930
concluded success. Frozen Bun install passed without lock changes. The tracked
role TOMLs parse with `Bun.TOML.parse` after the four model/effort replacements.
Definition's initial 21 behavior tests and focused type/build passed before
I-01 refinement. The later integrated cold proof below supersedes that partial
receipt; subsequent bootgraph and installed-fixture edits need their own gates.

Cold candidate proof after I-01/I-03/I-04/I-05 repairs:

- `bun run check`: passed, 26 projects / 92 tasks (60 cache hits), for the
  settled cold pipeline before final bootgraph and installed-fixture edits.
- `bun test packages/core/runtime/compiler/test`: 50 passed, 1,220 assertions,
  including isolated unchanged-cache restoration and relevant-input invalidation.
- Definition owner test: 22 passed; derivation owner test: 37 passed; terminal
  SDK test: 13 passed. All four owner builds passed.
- Independent composed review: no remaining P1/P2; 59 focused tests / 1,289
  assertions independently passed before the final added parity cases.
- Earlier composed runs exposed the nominal declaration mismatch and then two
  fixture typing errors. They are repaired, not waived. The final compiler test
  typecheck and full repository check passed after the fixtures settled.
- An in-memory real producer -> derivation -> compilation -> simplified
  bootgraph probe passed for four provider selections, dependency-first order,
  exact reverse release and all nine cold executable counters at zero.

- Bootgraph owner build, test and check passed: 12 tests / 16,703 assertions,
  including cache behavior. Independent semantic review found no P1/P2.
- `bunx nx run @habitat-ai/cli:acceptance:oclif-installed-package`: passed all
  nine tests on macOS, using local packed artifacts installed through the
  temporary registry. The first run exposed an obsolete declaration inventory
  assumption: the private handoff adds a unique-symbol field, not another
  public string field. The inspector now distinguishes it using TypeScript's
  computed-property and unique-symbol APIs; the full rerun passed.
- `bunx openspec validate realize-app-runtime-spine --strict`: passed.
- Final `bun run ci`: all build/check/test targets passed for 26 projects,
  118 tasks with 68 cache hits, after all source and installed-fixture repairs.

These are local source and installed candidate receipts, not merged, exact-main,
cross-platform installed or release claims.

## Next Packet

Native async, built process isolation and task 13.7 workflow admission are
merged and exact-main qualified. Native web is in repaired-candidate remote
qualification. Finish task 12.0's installed CLI input-admission gate, publish
the complete node, then let Graphite merge the qualified stack and verify
actual merge before the single consumed-branch sweep and exact-main gate.

Proceed to task 12.1 as a complete agent-plugin command/service/resource/profile
story. The opening packet records accepted semantic simplifications and the
required real-child cancellation repair. Resolve the remaining aggregate-input
admission and telemetry demand/public-identity joins from native contracts;
neither fake dependencies nor a second parser are accepted by default. Keep
the six commands, owner-local law and installed native/telemetry proof together.
Task 12.2 and the final audit/release retain their own actual acceptance gates.
Task 13.6 remains condition-unsatisfied, not an MCP attachment claim.

### Native CLI Input Admission

The final native matrix passes all 23 cases: zero-acquisition input refusals,
help and external commands; one native parse and acquisition on success;
invocation-local exact stdin bytes; pre-admission POSIX signal behavior;
managed acquisition cancellation; and actual later-harness mount failure with
rollback. Once a command is active, native finally and flush precede release.
Failure paths in the test driver kill and join owned children before rejecting.

Independent architecture/lifecycle, TypeScript and behavior review has no
remaining actionable finding after repairing signal ownership and the startup
rollback cycle. The first broad run found only fixture global typing, an old
projection error expectation and one formatting hunk; these are repaired.
The final `bun run ci` passes all 167 tasks for 35 projects (120 cache hits).
The complete installed suite passes all 10 tests, including the 23-case native
CLI matrix. Its first run exposed an accidental optional Oclif peer import in
the no-host consumer; that import was removed, not made a required dependency.
Actual native flag behavior remains in the native installed matrix, while the
peer-free consumer proves cold imports. Strict OpenSpec validation and diff
hygiene pass. Remote gates remain separate; domain-specific agent-plugin/dev
requests are not yet qualified.

### Accepted Binding And Execution

Tasks 8-9 turn the ready process into bounded resource access, cached native
service clients and non-oRPC descriptor execution, with one idempotent process
stop and no harness authority. The official oRPC family is coherently upgraded
to beta.32 while Effect remains beta.101, based on exact published runtime/type
probes. No community bridge or second service runner is introduced.

Independent review identified four narrow corrections while connecting the
actual owners. Process runtime directly imports definition-owned contract types;
the missing canonical definition edge is admitted rather than hidden behind
barrel re-exports. Task 8's vague retained-reader cutover means affected managed
binding fixtures and new SDK projections: existing SDK module globals, catalog
and CLI/Nx production readers still move atomically in task 11. Surface instance
names survive derivation but were absent from compiled plans; lower that field
directly from the already-validated plugin map. Runtime resource lookup follows
normalized resource identity, not a new resource-object equality restriction;
only the private ResourceRequirement map has the exact-reference law.

Native client assembly is one constructor capability over the service's private
router. Native options remain truthful and sanctioned, not falsely opaque;
they carry no managed runtime, scope or private provisioning store. Public
effect/context and effect/wrap project the actual native slot types, without
object-builder helpers that merely rename keys. Process assembly owns the
single native callback, policy/decorations and request accounting.

Exact beta.32 stream probes show both initial Promise settlement and a native
iterator finish callback can precede outstanding consumption. Track admitted
native calls plus native top-level stream lifetimes and pending pull/cleanup
operations using the vendor wrappers. Close admission, allow admitted work to
finish, then dispose. Stop does not invent cancellation or claim an abandoned
stream settled. Real HTTP disconnect remains a native-host gate.

The execution contracts now use native `Exit` and actual span correlation,
without a generic error vocabulary or a caller-classification object that has
no consumer. Shared inert invocation types belong in definition, avoiding a
runtime-to-SDK dependency. `EffectRuntimeAccess` is the existing private
execution capability, implemented as a closure; a separate forwarding object
or interpreter adds no protection. The ready handle refines its acquisition
error to `never` only after native context acquisition succeeds, while retaining
native managed-runtime methods and their scope/fiber registration. Native
failure, defect, interruption and combined-cause identities remain intact.

Independent binding review repaired two P2 defects. Exact handoff validation
now precedes cleanup ownership; a synchronous per-artifact claim transfers
cleanup to exactly one assembly. Mismatched and duplicate attempts leave the
accepted owner live; failed claimed assembly rolls back and requires fresh
provisioning. Typed invocation values use validation, not a second decode, and
are forwarded unchanged. A real string-to-Date schema discriminates the two
domains. Real SDK pipeline tests cover these cases and constructor rollback.

Execution review also found async derivation discarded process-owned execution
metadata. The live lowering now supplies execution and telemetry after copying
authored lane context, preventing poisoned same-named fields from replacing
actual trace identity. Native execution tests cover policy, causes, signal
rules, trace parenting, event failure isolation and stream cleanup before file
lease release. A direct ready-handle probe proves native fiber registration;
only the process admission path claims drain-before-provider-release ordering.

The source/structure audit found task 8.4 was not satisfied by the new blueprint
shell: graph assertions lacked incoming private-owner constraints, and some
provider package subpaths resolve in Nx to their parent resource. A repository
parser-backed access packet and graph acceptance close current production
consumer routes without banning raw Effect or adding another policy engine.
App/profile, adapter and harness-specific constraints co-land with their actual
task 10/11 owners; this does not claim a hostile-code sandbox or future hosts.

The first complete gates caught stale standalone constructor fixtures, a
generator still emitting beta.23, and installed probes relying on a transitive
vendor dependency. Repair the real native fixture assembly and declare the
probe's direct vendor dependency; do not weaken types or rely on hoisting.
The registered access rule also required the catalog's exact inventory oracle
to include it. All repairs passed the settled integrated rerun:

- `bun run ci`: 28 projects, 128 tasks, 86 cache hits; build/check/test passed.
- `bunx nx run @habitat-ai/cli:acceptance:oclif-installed-package`: all nine
  installed tests passed, including native assembly and the direct dependency.
- `bunx nx run habitat:acceptance:product-separation-absence`: eight tests,
  52 assertions passed, including actual Nx incoming edges and parser fixtures.
- `bunx openspec validate realize-app-runtime-spine --strict` and
  `git diff --check`: passed.

Independent final semantic/source review has no remaining P1/P2. The existing
proof-ledger steward lens confirms these are local task 8/9 acceptance receipts,
not release, merged-main, future-host or sandbox evidence. Negative Nx mutation
proof is not claimed; revisit it when introducing aliases or owner exceptions.
Tasks 8/9 are locally verified. Remote stack admission is next.

The next consumer review then exposed a real pre-merge task-8 defect: stop
between two dependency calls in an already-admitted native service refused the
second call. The discriminating real-lease regression fails while the six prior
binding tests pass. Merge is held for repair and renewed gates; the receipts
above do not waive this finding. Use native `Fiber.getCurrent()` and a private
`Context.Reference` to capture continuation when a view is created, then carry
it through official `effect/context`. Each actual invocation owns one lease,
retained through stream cleanup. Expired/foreign views and new root calls still
refuse. A pinned native probe establishes capture before the client's `await`
and delivery into the official handler, without AsyncLocalStorage, a global
pending-count exception or another runtime. This same repair prepares real
tool/background execution without duplicating their capability declarations.
The pinned [Effect fiber API](https://github.com/Effect-TS/effect/blob/effect%404.0.0-beta.101/packages/effect/src/Fiber.ts)
and [native procedure client](https://github.com/middleapi/orpc/blob/v2.0.0-beta.32/packages/server/src/procedure-client.ts)
anchor the capture/await distinction; runtime behavior tests remain decisive.

The continuation repair is now implemented and independently reviewed with no
remaining P1/P2. The tracker passes 12 tests/95 assertions; real SDK tests cover
the sequential child call, expired views, native stream cleanup and admitted
async-descriptor continuation. The full repository CI rerun passed 128 tasks
(84 cache hits), product separation passed 8 tests/52 assertions, and strict
OpenSpec validation passed. These are local receipts, not native-host evidence.

The first remote PR-1010 installed run passed Linux but exposed a Windows
acceptance-fixture defect: the compound adoption test exhausted its 180-second
budget, and its intentional forbidden-import mutation lacked guaranteed
restoration. Give only that compound test 360 seconds and restore its source in
`finally`; keep individual command deadlines and boundary assertions unchanged.
The repaired fixture passes all nine local installed tests (150.20 seconds),
and the final repository check passes. A fresh remote Windows receipt remains
required before merging the amended candidate.

The amended binding candidate `214eeffba` now passes both required Repository
Ratchet (33946644545) and Linux/Windows installed acceptance (33946644666).
This resolves the pre-merge Windows finding without a runtime packaging change.
The stack is not yet merged; task 10.1 proceeds on its child.

### Cold Adapters And Tool/Background Authoring

Task 10.1 is implemented and independently reviewed with no remaining P1/P2.
The five SDK faces provide native TypeBox tool schemas, typed tool/background
leaves and explicit plugin membership. Derivation retains exact operational
references and private schema/cadence projection; adapters lower selected
surfaces without executing or mounting. Actual invocation uses the existing
managed execution runtime with input decoding once across retries and fresh,
plugin-bounded clients/resources. Cadence is metadata, not a scheduler.

Review exposed two defects now repaired: admitted streamed resource views must
retain their existing continuation lease through cleanup, and pure generators
must infer `never` error/environment channels rather than invented requirements.
Default author contexts expose no ambient service clients. Real integration
proof covers native service calls, retries, failures, cancellation, streamed
cleanup, and stale-view/post-stop refusal. No native agent/desktop host is implied.

The complete immutable process-runtime blueprint v2 adds only the adapter raw
Effect import law. Its positive/negative native-engine proof runs in the
existing uncached product-separation acceptance target, not a cached owner
test that omits blueprint inputs. V1 is unchanged.

Final local proof: repository CI 128 tasks (86 cache hits); repository check
101 tasks; all nine installed SDK/CLI tests including installed exact-AER and
no-ambient-client type proofs; product separation nine tests/61 assertions;
derivation 42 tests/1,129 assertions; SDK runtime integration 24 tests; strict
OpenSpec validation and diff checks. The first CI attempt sampled a test before
its final formatting and failed lint; the settled-file rerun passed. The first
installed attempt exposed a missing v2 closure inventory expectation, now fixed.
Remote tip admission and exact-main verification remain required before merge
or release claims. Next: admit this complete stack, then generic native-harness
contracts, mount-ready handoff and mounting/observation, without resuming products.

### Harness Contract And Mount-Ready Handoff

Tasks 10.2-10.4 are implemented and independently reviewed with no remaining
P1/P2. The new private harness owner supplies the exact type-only public
companion contract, owner-local stop and health admission, complete v1 law,
and isolated cache restoration/invalidation proof. The process owner completes
all selected assignment validation and lowering before emitting frozen
mount-ready records with exact identity, bounded access and one stop handle.
No compiler/provider producer locals or private native handles enter the public
contract. This is not production host or generic mounting acceptance.

The real SDK loopback HTTP fixture mounts a lowered tool and holds an admitted
request across shutdown. Closing admission is synchronous and non-releasing;
new invocations refuse, the admitted request completes, native cleanup reads
its still-live file resource, and resource release follows native settlement.
The fixture owns its HTTP host only; it is not the future Elysia qualification.

Review repaired two further P2s: an earlier lowering callback could retarget a
later mutable adapter after preflight, and acquisition alone could falsely
pass explicitly required provider health. Preparation now snapshots assignment
identity and refuses drift before invocation. Explicit required health remains
unknown/failing without a probe contract, including selected optional coverage;
unused profile providers stay inert. No probe engine was added.

Final proof: full repository CI passes 133 tasks (82 cache hits), process
handoff tests pass 46 tests/320 assertions, and all nine installed SDK/CLI
tests pass (155.17 seconds), including cold public imports and an independently
typed companion. Native product-separation and adapter/harness law proof pass;
strict OpenSpec and diff checks pass. Earlier full/installed attempts exposed
two stale SDK export inventory assertions, both repaired before acceptance.
The four predecessor PRs are green, not yet merged. Next: native stack admission,
then the non-authorizing observation projection and process-local mounting.

### Observation Projection

Task 10.5 is locally accepted after independent review with no remaining P1/P2.
The private owner and type-only SDK face expose a real selected-topology catalog,
bounded immutable histories and meaningful explicit telemetry. The SDK fixture
derives its seed through actual compilation, provisioning and mount preparation;
a real native release defect supplies the admitted finalization record. Phases
not yet wired remain explicitly unobserved, not invented successful history.

Review removed unnecessary identifier/copy quotas and a blanket Effect-import
ban. It also repaired two opposite telemetry mistakes: stripping all authored
metadata made the API useless, while correlating only by process ID or a local
span counter conflated launches. Records now preserve explicitly authored safe
data with detached full launch identity and unique span IDs. Unknown provider
payloads remain closed and redacted; sink failures cannot replace results or
errors, and application results/errors are never exported automatically.

Verification: full repository CI passes 138 tasks (63 cache hits); all nine
installed SDK/CLI tests pass (155.77 seconds); uncached product-separation and
three native owner-law tests pass 11 tests/83 assertions. Observation behavior
passes 11 tests/101 assertions, the isolated cache test passes 11 assertions,
and four real SDK composition tests pass. Strict OpenSpec validation and diff
checks pass. Next: preserve the clean candidate, sweep the four actually merged
predecessors once, then implement 10.6/10.7's complete process-local mounting
and terminal SDK startup. These receipts do not claim a package release, native
host qualification, or collector persistence/query acceptance.

### Process-Local Mounting And Terminal Startup

Tasks 10.6/10.7 complete real terminal SDK composition, exact per-start native
registration, private mounting custody, distinct health and single-flight
finalization. Actual startup, native mount, health and stop publications extend
the observation read models; unobserved execution history stays unobserved.
The public handle controls only its own selected process. A deadline reports
pending native cleanup and never disposes resources early.

Independent review repaired two P2s: a throwing optional native health getter
could escape custody of a valid stop handle, and finalization diagnostics used
the wrong phase. Startup readiness refusal now also closes its acquired process.
Real loopback HTTP/file-lease regressions prove held requests, reverse cleanup,
original-error preservation, distinct same-selection restarts and no premature
release. Mixed agent/tool and desktop/background registrations reuse one native
descriptor in one mount. Inline authoring retains callback context inference.

Full repository CI passes 143 tasks (81 cache hits). All nine installed SDK/CLI
tests pass (157.17 seconds), including two real process leases through only
packed public SDK imports. The first full gate exposed missing transitive
external declarations and a cross-owner fixture mixing source and bundled
nominal types; the repair preserves one private declaration origin rather than
adding casts, private graph edges or public runtime factories. These are local
acceptance receipts, not package release or production-host qualification.
Uncached product-separation and four native owner laws pass 12 tests with
94 assertions. Strict OpenSpec validation and diff checks also pass; the final
independent review has no remaining P1/P2.

The next complete story is Habitat's Oclif self-host, co-landing 11.1-11.5 so
commands and Nx readers leave the old module-global acquisition path together.
Vendor review uses pinned Oclif 4.13.3. Native dispatch/finally/flush/exit and
static manifest discovery need actual built-child proofs. The catalog's real
filesystem/path dependency must be supplied explicitly alongside the independent
source-inventory and rule-evaluation resources, not hidden in service construction.

The first implementation pass exposed a package cycle in putting pure command
authorship in the CLI distribution while that distribution bundles its selected
topic. The curated native authoring face instead lives at
`@habitat-ai/sdk/plugins/cli/oclif`: native Args/Flags types and metadata, one
Effect body, optional native presentation. It imports Oclif only as types; the
optional peer does not activate a host. Topics depend on SDK and native Oclif,
never back on the app that selects them. `@habitat-ai/cli/host` owns the one
native loader, source bundle and lifecycle, not command authorship.

Cold derivation retains exact CLI native source objects alongside full execution
refs, outside portable artifacts. The live adapter's compiled refs and sources
must exactly match native discovery before dispatch. Source mode uses Oclif's
per-Config `pjson` input to name the source command/finally module; installed mode
uses its static manifest module. No process-global debug, environment or
transpilation switch is needed. Both modes keep native vendor plugin loading.

Nx receives a bounded catalog-data reader through the same selected native
process, not an escaped managed client. The native catalog Promise helper stays
available for external callers supplying ready dependencies, as canonical
section 11.8 permits; Habitat's managed command bodies do not use it.

Tasks 11.1-11.5, 11.7 and 11.8 now pass their local acceptance. The CLI bundles
its selected private topic, catalog and providers, keeps the public SDK in one
external module realm, and resolves package assets by lazy package self-reference
rather than bundled chunk depth. Installed acceptance caught and repaired the
chunk-relative template root and nonportable private workspace dependency
metadata. Native external-plugin acceptance also forces the candidate SDK
tarball into the CLI's transitive graph and proves exact module resolution.

The first full gate exposed stale derivation inventories, a misplaced official
Effect extension bootstrap and a missing provider declaration comment. Repairs
preserve the existing policy: native oRPC installs the extension only in the
implementation owner, and derivation openly retains its cold CLI source lane.
No checks were weakened. The final independent boundary review found no P1/P2.

Final verification: `bun run ci` passes 157 tasks (78 cache hits); all nine
installed SDK/CLI tests pass (179.11 seconds); the seven native runtime cases and
two real external-plugin lifecycle tests pass. CLI behavior passes 126 tests;
uncached cumulative separation and native owner-law acceptance passes 16 tests
with 144 assertions. All immutable app-version asset checks remain intact.
The native matrix now asserts actual registry, adapter, mounting and harness
observations in both local and installed children, without inventing execution
history. Strict OpenSpec validation and diff checks pass. Task 11.6 remains open:
existing service generators do not substitute for its two new source creators.

Clean-checkout CI for PR 1015 subsequently found that CLI test typechecking
needed its own build prerequisite for native fixture declarations; prior local
build output had masked the missing task edge. Windows installed acceptance
also rejected the fixture's guessed dependency-directory layout. The repair
resolves each SDK/Oclif/Effect package from the installed CLI's actual package
context, links that exact cohort and asserts physical identity before manifest
generation. The local native matrix passes after this repair. Repair commit
`cf624450578b122b1297e5095c45b46cea6ec57a` is submitted in PR 1015 itself:
test typechecking passes with the CLI dist directory physically absent before
the uncached Nx run, and all nine installed tests pass again (179.50 seconds).
Required CI 33959536417 and Linux/Windows installed acceptance 33959536416
subsequently passed this exact repair revision. PR 1016 also passes required
CI 33959793691 and both installed lanes in 33959793759. Stack merge remains
distinct from these candidate receipts.

The next generator design loop is bounded by pinned Nx 23.1.1 evidence.
Its native generator stages a virtual Tree, then flushes paths sequentially;
a real second-path failure leaves the first path published. Replace the inherited
multi-file atomicity promise with complete validation before staging, exact-byte
convergence and no publication on generator refusal or dry-run. A native disk
flush error remains a failure that may leave a written prefix, never a claimed
rollback or complete result. Do not add a custom filesystem transaction engine.
Existing topic ownership and explicit command membership supply registration;
native build generates Oclif manifests. No new Nx project or direct generated
manifest edit is required. Apply these refinements with the implementing story,
not by silently treating the old stronger specification as satisfied.

Independent generator review repaired module-binding collisions, later object
properties replacing command membership, and payload IDs mistaken for SDK
command IDs. A follow-up caught unresolved SDK metadata hiding a real duplicate
ID. The source generator now refuses that unqualified form before writes; an
explicit final ID following earlier metadata still works. This is a bounded
source-editing support contract, not a new restriction on ordinary SDK authorship
or an invitation to evaluate arbitrary application code. External extensions
remain ordinary Oclif packages with no Habitat SDK dependency or invented Nx owner.

Task 11.6 is locally accepted. All 80 focused generator tests, CLI source/test
typechecks, strict OpenSpec validation and the full 157-task repository CI graph
pass. The exact installed-generator target passes in 63.88 seconds using packed
candidate SDK/CLI artifacts: native Nx generation, dry-run and exact-repeat
non-mutation, divergent-path and foreign-owner refusal, unchanged Nx identity,
generated command build/body tests and real native host dispatch, plus an
independently installed/built/tested portable external extension. Independent
repair review reports no remaining material issue. This is not an npm release
or task 12.3's installed authoring-command proof. The next complete capability is
that thin CLI projection, not a new lifecycle or filesystem transaction system.

### Installed Authoring Commands

Task 12.3 is locally accepted. The selected private authoring topic exposes
only the two qualified source creators through native Args/Flags and the
existing Oclif process. Two app-injected stateless runners capture invocation
cwd and call the same generators through native FsTree. The shared publication
helper owns only native lock, change inventory and flush; it adds no alternate
generator, workspace search, transaction engine or SDK lifecycle.

Independent review caught cancellation settling an interruptible Effect while
its uncancellable generator Promise could still publish files. Each command
now joins that finite started operation uninterruptibly, then preserves native
interruption. Gated tests prove no early invocation settlement and no invocation
when interruption wins before entering the publication boundary. This is not
rollback and does not claim generic pre-aborted native runPromise suppression.
The final independent review has no remaining P1/P2.

Verification: all 89 generator tests, nine topic tests, source/test TypeScript,
native projection, owner law and full repository CI pass (162 tasks, uncached).
All nine installed-package tests pass in 201.32 seconds after the cancellation
repair. The installed matrix exercises both command creators, exact-byte parity
with native Nx, dry-run and convergence, refused divergent/foreign writes,
generated command build/body/native dispatch, and independently installed
external extension build/tests. This is candidate acceptance, not release.
Next: admit this story and continue with complete native Elysia/oRPC server
qualification, rather than a listener-only intermediate or product resumption.

The authoring candidate's remote required check exposed only an undersized test
budget around three bounded native generator subprocesses. The repair retains
each 30-second subprocess deadline and gives those two integration tests a
120-second outer budget. Corrected candidate `e2f7389af` passed required run
33962851522 and Linux/Windows installed run 33962851116. Graphite's one native
stack merge completed PRs 1012-1017, ending at main
`c954d04cb67280cff51d5f71a8d154d6b8410473`; exact-main verification remains
separate from those candidate receipts. No runtime behavior changed in this repair.

### Native Server Qualification

Tasks 13.1/13.2 are locally accepted. Cold Elysia descriptors, selected exact
server factories, native public OpenAPI/internal RPC and official `.effect`
requests now compose through the existing process lifecycle. Two real hosts
share one provider topology. Request abort finalizes the native Effect; graceful
stop refuses fresh connections, retains gated requests through the deadline,
and releases resources exactly once only after native settlement.

Independent reviews repaired cross-owner route shadowing using the pinned
native router's overlap/matching facilities, and retained native trace IDs for
ordinary `.handler` calls as well as `.effect`. No remaining P1/P2 was found.
Actual OTLP receipt proves both native procedure and nested Effect correlation;
disabled telemetry preserves the same lifecycle without inventing trace IDs.
No second runtime, telemetry provider, request interpreter or routing engine
was introduced. Native exception sanitization and backend queryability remain
the separately named qualifications below.

Verification: full repository CI passed all 163 tasks for 35 projects (eight
cache hits). All nine installed-package tests passed in 207.25 seconds after
correcting the packed blueprint structure inventory to include harness v2.
Installed proof covers cold optional-host imports and the shared native
oRPC/Effect dependency realm, not a packed Elysia child launch. Three isolated
owner cache proofs passed 36 assertions, including exact output restoration
and relevant-input invalidation. Native source-law regression tests passed
four tests/21 assertions; strict OpenSpec validation passed. The strengthened
composed fixture additionally checks request-signal identity and native defect
response sanitization. These are local candidate receipts, not release or
remaining async/same-app child acceptance.

PR 1018 is merged at `37e22198954abd32745029ed68e9ea74c345f3d3`.
Candidate `896437a741ea0177d795b216bd17a7b9af3ef1c2` passed required CI,
Linux installed acceptance and an unchanged Windows rerun (23m35s). The first
Windows job hit its 25-minute deadline without an assertion failure; no
unproven runtime fix or timeout increase was made. Graphite completed the merge,
and one force/no-restack/noninteractive sync swept the consumed server branch.
The active async work and held unrelated worktrees were preserved. Exact-main
required run `33967485217` also passed on that merged SHA.

### Native Async Review Loop

The complete native fixture now passes Serve and Connect, each with telemetry
enabled and disabled, using Inngest 4.18.0 and Dev Server 1.44.0 without
containers. Both checkpoint modes prove actual failed-step retry, memoized
completed steps, native history, decoded outer data and native Date/void result
serialization. Three selected async surfaces share one native host. Gated
ordinary work, a schema-rejected function's native onFailure handler and a
natively cancelled run all retain resources until actual callbacks settle;
cancellation does not interrupt an already active Effect body. Real OTLP receipt
contains native Inngest spans with managed Effect descendants. These are
composed source-fixture receipts, not installed children or Cloud qualification.

Native source review rejected tracking the authored orchestration Promise:
ordinary replay discovery can leave it suspended after the request has ended.
One exact cohost now uses native finite `wrapRequest` ownership, inherits an
already admitted Serve request and retains actual managed step descendants.
The owned middleware is scoped to exact functions and removed only after native
stop and callback drain. It covers normal native middleware and onFailure
without a second client, runtime or telemetry provider. A subsequent native
fixture pass also exercises function-level middleware that copies its context;
the private admission witness survives ordinary native composition. Required
lifecycle events are asserted present before their ordering is compared.

Packaging review found a separate real defect: aggregate declaration imports
made unrelated app/derivation consumers resolve the optional Inngest peer.
The repair narrows imports to existing owner leaves and separates the opaque
compilation reference contract from native source accessors, preserving exact
typed native references privately and the genuine official oRPC Effect
augmentation. The strict installed no-host consumer first reproduced all three
missing-Inngest declaration errors, then passed after repair; neither error
suppression nor making Inngest mandatory was used.
Private DTS bundling had also duplicated nominal witnesses between an assembly
barrel and the emitted leaf now consumed directly. Private declarations now
re-export their emitted leaves, preserving one identity without changing JS
bundling or the terminal SDK's public bundling. Process typecheck passes that
repair. The immutable mounting-law successor admits the definition-owned
observation leaf while continuing to reject the live observation owner; the
original basename-only rule confused those distinct owners.
All nine installed-package tests pass (206.50 seconds). Independent declaration
closure review found no Inngest/Elysia dependency in app, generic harness,
derivation or service faces, no missing relative targets across all 48 emitted
declaration files, and intact native async authoring types and Effect bootstrap.
The first complete repository pass qualified all 164 tasks (29 cache hits);
the final pass after the last extensionless bootgraph-barrel repair also passes
all 164 tasks (87 cache hits, 3m24s). Native
function-middleware copying, lifecycle event presence and explicit service
invocation/schema validation now have discriminating proofs. Remote admission
remains open; built children, WorkflowDispatcher and Cloud/backend qualification
are not implied by these receipts.

### Built Process Isolation

Task 13.5 uses one complete owner-local app@2 source fixture, one finite
server/async process catalog and separate thin entrypoints. A temporary ordinary
SDK tarball install supplies one exact native vendor realm. The pinned CLI checks
that installed app@2 selection and structure; each entrypoint independently
passes strict TypeScript and builds to external-package Bun JavaScript before
the driver starts either child. No production app or child Nx project is added.

The local native receipt passes five actual child lifetimes: server and async,
each independently restarted, then an async acquisition failure caused by
removing a real required backing file. Distinct PIDs and live file-descriptor
tokens prove separate ownership; exact frozen launch identities agree across
entrypoint, started process, native mount and catalog. Real Elysia HTTP and
Inngest event-triggered operations use their own acquired resources. Each
healthy child stops only after its held operation and native stop settle,
shares one repeated-stop Promise, and releases its file once. Its sibling's
held work, identity, lease, native state and counters remain unchanged.
The failed async start acquires and rolls back its file dependency without
mounting; the existing server remains healthy and serves another real request.
Readiness and liveness are distinct and process-local; queries admitted just
before stop resume fail-closed, and later queries refuse.

The first probe exposed a test assumption, not a new runtime defect: a native
step completed during drain, then non-checkpointed replay attempted the closed
SDK listener and Inngest reported `FAILED` with `Unable to reach SDK URL`.
Acceptance now requires the admitted step's actual completion and finalizer,
preserves that native run outcome, and never equates drain with durable run
completion. Initial and restarted native workflows must still complete normally.
Exceptional test cleanup attempts every owned process and workspace even when
one cleanup fails; forced termination is never accepted stop evidence.

Independent review found no unresolved runtime or package-identity defect. It
did identify the test cleanup failure path and missing exact catalog membership
assertions; both were repaired. The ordinary native harness test now depends on
the separately named noncached `acceptance:process-isolation` target. A clean,
uncached SDK build with its previous dist moved out passed all 12 build tasks,
so the public-import child sources do not create a declaration bootstrap cycle.
The final full repository CI passes all 165 tasks for 35 projects (89 cache hits,
2m25s), including another real packed-child receipt. Strict OpenSpec validation
and diff hygiene pass. Candidate `0290cd07bc3a0c4b1cc1218d072fdc1f5006744d`
passed required run `33981413686` and installed run `33981413729` on Linux
(4m57s) and Windows (19m18s). Graphite merged PR 1020 to
`46bb598f865069c4c600b96c4a7928ad3bb8f8da`; exact-main run `33982459421`
passed. One force/no-restack/noninteractive sweep removed the consumed branch
and reparented the active admission work without modifying it or held work.

Native async candidate `fdee504dea0b61f3ca0cd865567c33392fc82780` passed installed
acceptance on Linux (6m17s) and Windows (21m32s). Its first required run failed
only an unchanged cache-precision test's 60-second aggregate timeout; all other
214 CLI tests passed. The same test passed on the server candidate, server main,
and actual local async CI. The unchanged failed-job retry passed. Graphite merged
PR 1019 at `485e798e8480e937169a50cfee5d19abd86b05f8`; one
force/no-restack/noninteractive sweep removed its consumed branch and preserved
the active child and unrelated held work. Exact-main run `33981290836` passed.
No speculative runtime change or timeout increase was made.

### Workflow Admission Design

Three perspectives reviewed task 13.7: exact cold identity/reachability, native
process lifetime, and the external SDK ergonomics proposal already recorded
below. The proposal supplies no missing dispatcher syntax. The owner-delegated
decision is one named `useWorkflowDispatcher(plugin, { workflows, client })`
helper on the server authoring face, mirroring the existing service-use map.
`plugin` is the exact app-member workflow plugin occurrence; `workflows` is an
explicit nonempty exact-member subset; `client` is an existing required resource
reference. `context.workflows.<name>.send(workflow, payload)` admits only that
group's exact workflow references and infers payload from the selected target.

The helper implies its client requirement in the caller's ordinary resource
requirements, deduping an identical reference but preserving existing conflict
refusal for conflicting requirements. This is not a security ACL: authors
holding the native resource can call it through the ordinary resource lane.
No dispatcher-only resource owner or hidden filtering is introduced.

Derive admission only for explicit uses. Remove the automatic unused dispatcher
descriptor produced solely by selecting async execution. Preserve the exact
eight-field descriptor and digest for target plugin occurrence plus sorted
requested workflow subset. Different subsets have distinct descriptors;
identical subsets may reuse one descriptor, even with different caller/client
bindings. Live capabilities remain keyed by caller and local use name, never
only by descriptor ID. Exact target, schema, client and caller references remain
in the private selected handoff. Target membership must not select its async
execution surface, steps, services, execution resources or harness.

After provisioning, use the exact acquired native client. Call schema
`validate` once before send and forward the original payload, not a decoder or
validator replacement. Native serialization and the receiver's decode retain
their own boundaries; no arbitrary codec round-trip guarantee is added. Return
only frozen native `eventIds` and preserve native rejection. A narrow optional
`{ id }` argument forwards the native source-event ID for publication retries;
it adds no Habitat deduplication or exactly-once promise. Add no run IDs,
success flag, admission timestamp, routing/control options or implied exclusive target.
Sending an event can fan out to every native matching function. Retain the
native Promise through the existing admitted invocation/descendant tracker,
including unawaited sends and caller interruption; Inngest supplies no send
AbortSignal, so Habitat must not pretend to cancel it.

Root owns canonical examples, SDK exports, installed/native end-to-end proof
and final synthesis. Definition owns the helper and typed server context;
derivation/compiler owns exact cross-owner reachability; process-runtime owns
materialization and descendant lifetime. Discriminating tests must cover
server-only startup with execution resources absent, foreign/copied/unlisted
targets, disjoint named groups/client instances, schema refusal without decode,
real event IDs/fan-out and a gated native send surviving cancellation and stop.

Native event-ownership review refined the initial no-options proposal: omitting
the source-event ID would force ordinary outbox/publication retries to bypass
the curated dispatcher. The team admitted only that existing native identity
field, not a speculative options bag or a Habitat idempotency mechanism.

### Workflow Admission Qualification

The cold relation, process binding and terminal SDK face are implemented. A
server-only native fixture has no provider for the target's execution-only
resource and no async integration. It starts successfully, admits through two
distinct acquired Inngest clients, and observes actual Dev Server event IDs and
both independent native matching functions. Exact named subsets share metadata
without sharing client binding; copied/unlisted workflows and invalid payloads
send nothing. Native middleware sees the original Date-bearing object, while
the receiver sees native JSON. No Habitat decoder or async body runs.

Two real native sends remain pending in middleware after acknowledgement.
An interrupted Effect caller finalizes and an unawaited caller returns, but
process stop retains both clients and their live file dependency until both
native Promises settle. Results freeze native event IDs; no run-completion or
Cloud guarantee is inferred. The observer explicitly uses checkpointing and
the already qualified Dev Server output query rather than misreading its
event-level output placeholder.

Independent review accepted and repaired two API defects: inherited structural
`options.id` was silently dropped, and the omitted workflow context generic
allowed undeclared names. The native ID getter now reads once and forwards
unchanged; the default context has no workflow groups. Definition/API and
native request/dispatcher regressions cover both. Fixture cleanup also now
covers every acquired-resource interval and unconditionally closes the file
on failed startup without demanding a native mount that never happened.
These repairs do not add an options engine, security ACL or lifecycle owner.

Ordinary CI includes the noncached `acceptance:workflow-admission` target.
Installed declaration, API and native-peer isolation checks extend the existing
packed consumer, rather than introducing another distribution or test harness.
The final native fixture and complete repository CI pass: 166 tasks for 35
projects, 75 cache hits, 4m51s. The final installed run passes all nine tests
(210.83 seconds), including cold optional-peer isolation and the repaired
positive/negative authoring consumer. Strict OpenSpec and diff hygiene pass.
Remote candidate admission remains open.
Its first run passed eight of nine tests; the new no-host consumer alone failed
because its test imported an undeclared optional Inngest peer. That consumer now
uses the public peer-free sender contract; native compatibility stays in the
actual native proofs rather than weakening no-host isolation.

The first CI run hit missing harness declaration outputs. An unchanged uncached
owner rebuild passed all eight producer tasks, followed by the complete passing
CI. An isolated probe reproduced a pinned declaration-plugin recovery defect
when an emit-complete build-info file survives declaration deletion; ordinary
no-emit/typecheck timing controls passed. The original stale-output trigger is
not established, so no speculative scheduling or dependency change is admitted.
Re-entry is a repeat missing-output failure with that producer state captured.

### Conditional MCP Companion

Task 13.6's independent-artifact condition is unsatisfied as of 2026-09-05.
The [exact npm version](https://registry.npmjs.org/mcp-openapi/1.0.0) returns
404; the public package name belongs to a different publisher. The independent
`rawr-ai/mcp-openapi` source exists at clean revision
`723866bc44998a6fb69f32b305f99f43c90c4c67` with manifest version 1.0.0,
but its checked GitHub releases/tags are empty and its checkout has no package
artifact. Magic consumes a `file:vendor/...` tarball, which is explicitly not
an admissible Habitat source. This is absence of evidenced release provenance,
not a claim that no companion source exists or an artifact cannot be produced.

Its current public `serve(Config, { signal? }): Promise<void>` and dedicated
process runbook do not establish a ready mount/health receipt compatible with
Habitat's generic harness lifecycle. Re-enter only with an independently
versioned ordinary artifact and qualified public lifecycle. No MCP dependency,
internal implementation, authoring face, copied artifact or release claim is
admitted; the generic companion contract remains unchanged and core work proceeds.

### Native Web Design

Two independent cold/API and native-lifecycle reviews converged on one route
array with disjoint arms: existing `{ id, path, module }` and new
`{ id, path, effect }`. The latter retains one exact cold web descriptor from
`defineWebEffect`; `route.id` supplies the existing `plugin.web-surface`
occurrence identity. There is no second authored ID, separate effects tuple,
discovery inside loaded modules or new descriptor registry. The derivation
owner lowers cold web bodies through the definition-owned helper into ordinary per-occurrence operational
descriptors with private route projection, using the same selected derivation,
compilation and process execution path as other non-oRPC boundaries.

For this first qualification, actual web-local execution means request-time
work in a selected web-role host process. The original native Request is the
existing procedure-context `input`; the result is a Response. Explicit ordinary
host-process resource requirements are admitted; direct service binding stays
absent. The body uses the existing resources, execution and telemetry context,
native Effect values and policy. Request.signal supplies cancellation. No
request reconstruction, second Effect runtime, browser resource inference or
second request/context bag is added.

Lazy route modules remain a different channel. Pass the existing exact
WebRouteModuleTable through terminal startup to selected process lowering;
resolve only the compiled route references. Module loaders run at native mount,
not derivation, build-graph discovery or Effect execution. The generic payload
distinguishes loader entries from bound Request-to-Response callbacks. The
qualified Bun companion accepts the native module default HTMLBundle, owns the
one native route map, rejects duplicate exact path ownership and otherwise
retains Bun's native matching, asset and HTTP behavior. No wrapper around an
arbitrary second mount callback satisfies this story.

The pinned Bun 1.3.14 probe qualifies the canonical lazy TypeScript route module
that statically imports HTML and exports its native HTMLBundle. Both unsplit and
split/minified AOT builds run with source unavailable and serve actual HTML,
JavaScript and CSS. Direct dynamic HTML imports instead fail in the native
bundler (`require_page` undefined), so they are not a qualified example. Native
AOT asset paths are output-relative; the deployment launches from the artifact
root. Habitat does not change cwd or rewrite the native manifest. Bun owns the
build through ordinary deployment tooling, not an author-callback parser or
runtime bundler.

The real native probe proves graceful stop refuses fresh connections but waits
for both a held handler and a separately gated Response body. The existing
invocation tracker does not yet retain Response.body: the implementation must
extend its same lease through actual body settlement/cancellation, including
pending native reads and cancellation cleanup. It must not create another tracker or claim that callback return
proves HTTP drain. Native status/headers/body semantics matter; arbitrary custom
Response subclass identity is not a new promised protocol.

A follow-up native probe distinguishes transport stop from async body-cancel
cleanup: Bun may finish `stop(false)` before that cleanup settles. The existing
invocation lease must retain it independently. Bun also requires a real branded
ReadableStream as Response.body; the existing override-proxy stream cannot be
used there. Reuse the native stream wrapper without an override and reconstruct
an ordinary Response, preserving status, headers and body, instead of adding a
new stream or invocation protocol.

The discriminating cancellation test also establishes the native limit:
WHATWG cancellation closes pending reads immediately, before the underlying
source's hidden async `pull` work must settle. An authored source must settle
that work through its own `cancel` promise. Habitat retains native reads and
cancellation cleanup, not unobservable abandoned work. Positive proofs join
underlying work in `cancel`; the boundary proof refuses late capability access
after native ownership ends. This follows the
[native cancellation algorithm](https://streams.spec.whatwg.org/#readable-stream-cancel),
not a second Habitat stream runtime.

Independent review found and corrected a cross-lane regression before admission:
Response body retention is explicitly enabled only for web execution on the
existing tracker. Other lanes preserve their original Response identity and
settlement, because native async serialization need not consume an HTTP body.

A no-SDK Bun 1.3.14 discriminator also shows that an unhandled native route
rejection can serve HTTP 500 but leave a nonzero child exit at graceful stop.
The companion now uses Bun's ordinary
[error callback](https://bun.sh/docs/runtime/http/error-handling) for a bounded
500 response, preserving internal execution failures without leaking details or
resetting process exit state. The composed proof asserts the actual failing
Effect ran, not merely a generic 500, and requires every lifecycle event before
comparing its order.

Current proof: both unsplit and split/minified ordinary installed SDK builds
run with route/HTML/JS/CSS source unavailable. Actual native asset fetches,
request body/path/headers and Response status/headers, Effect failure and request
cancellation, joined body cancellation cleanup, expired capabilities and real
file release all pass. This does not claim browser JS execution, framework SSR
or a new browser runtime. Shared repository and installed-policy gates remain
required before this node is admitted.

Review/qualification disposition: definition behavior and strict types pass
(53 tests, 695 assertions); cold derivation/compiler behavior passes (154 tests);
process/native owner behavior passes (100 tests, 737 assertions). Independent
architecture, TypeScript, behavior and native-lifecycle review found no remaining
material issue after the scoped Response retention and failure-oracle repairs.
The new complete harness law v4 also corrects an inherited basename false
positive for the definition-owned observation leaf; actual lifecycle-owner
imports remain forbidden, and v1-v3 remain immutable. Four isolated pinned-CLI
law tests pass (36 assertions).

The final shared `bun run ci` passes all 167 tasks across 35 projects, including
real web acceptance, all other native fixtures, owner cache proofs and topology
policy. The first shared run found only an SDK export-order lint fix; it was
repaired before the successful complete rerun. Installed-package acceptance
passes all 10 tests, including cold Node web imports, strict peer-free public
declarations, native v4 positive/negative structure and import acquisition, and
immutable predecessor hashes. Tasks 14.1/14.2 are satisfied locally; candidate
remote admission and exact-main verification remain distinct required gates.

Root owns SDK startup/faces, selected harness law successor, installed built
fixture, canonical examples and final qualification. Definition owns the cold
route/body contract; derivation/compiler owns exact references and selection;
process/native ownership handles lowering, Effect context and HTTP lifetime.
Qualification must prove cold counters, build output with source unavailable,
real resource-backed success/failure/abort, response stream drain, retained-view
refusal, native stop before release, and installed import isolation. No deleted
Vite/React product, `apps/web`, new production app, native browser controller or
full SSR framework claim is restored.

### Backend Receipt Reuse

Read-only discovery found a running Podman machine `orpc-efficacy-085`, cached
ClickStack 2.21.0 images and stopped prior fixtures, but no running telemetry
containers or reachable backend. No infrastructure was started or modified.
The held native-platform-telemetry worktree's
`tools/native-platform-telemetry-receipt/src/receipt.ts` is useful reference:
it starts the digest-pinned ClickStack local image with a dynamic loopback OTLP
port and queries `default.otel_*` tables using `podman exec ... clickhouse-client`
and a unique `receipt.id`. It requires no externally exposed ClickHouse port.
Its staged WIP and unchecked receipt tasks are not acceptance; do not run its
whole older server/CLI/Inngest fixture as a task-7 gate or restore it wholesale.
Reconcile and reuse the setup at the collector/storage/native-host boundary.

That held design places EVLog at native Oclif invocation, oRPC attempt and
Inngest attempt boundaries; service code enriches the existing event. Final
events flow through the one OpenTelemetry Logs pipeline, not a second OTLP
writer, resource bootstrap or shutdown owner. Treat this as a source-backed
integration input to requalify with the new native hosts, not current runtime
implementation evidence.

Native exception policy is a separate, explicit qualification input: pinned
oRPC and Effect OpenTelemetry capture exception messages/stacks and status text.
The provider's exportedAttributePaths config filters its authored defaults and
technical logs, not arbitrary native spans. Current acceptance proves no
automatic request input/output capture and data-only Habitat diagnostics; it
does not claim all wire telemetry is secret-free. Before external backend
deployment, qualify a deliberate secret-bearing exception against the chosen
provider-owned sanitization policy. Preserve native outcomes and useful trace
identity rather than modifying errors in the request bridge. This remains an
unretired full-observability/export-policy obligation, not a generic catalog
redaction engine or permission to reuse held telemetry WIP unchanged.

### Vendor Reference Maintenance

Owner continuation requests bounded maintenance of the recently authored deep
skills when vendor differences matter. Canonical generic skill knowledge belongs
in Marketplace at `Documents/.nosync/DEV/habitat/rawr-hq`, under
`plugins/agents/dev/skills/{effect-ts,effect-orpc,orpc}`; no repository rename or
vendor-source import into Habitat is needed. The installed entrypoints match
those sources. Portable mini fixtures already exist in each skill's
`assets/verified-fixtures`; complete research mirrors remain external.

The local `.repos/effect` mirror is beta.94 from `effect-smol`; July research
mirrors contain Effect beta.98 and oRPC beta.17. They do not establish Habitat's
beta.101/beta.23 behavior. Current material drift includes Effect's move back
to `Effect-TS/effect`, beta.101 interruption/traversal fixes, beta.23 extension
typing fixes and official beta.32's new Effect client. Requalify exact relevant
tuples with source and runnable fixtures; preserve frozen receipts and update
generic skill guidance only where changed behavior matters. No current dependency,
Marketplace source, cached skill or mirror has been modified by this investigation.

### Optional Comparator Research

Owner continuation note: retain a secondary, non-gating reference investigation
into similar open-source runtime platforms. Candidate classes are Effect-based
agent/orchestration platforms and independently designed platforms such as
Encore.ts. Begin by selecting relevant comparators and mapping concrete
questions to Habitat owners, not by conducting a broad survey. Lifecycle,
dependency ordering, startup failure, shutdown and orchestration boundaries
are possible comparison points; no implementation equivalence is assumed.

Trigger this when a real unresolved design question would benefit from external
contrast, or during a later platform assessment. Root or the future DRA owns
the scoped brief; a research peer should inspect primary docs and licensed
source and distinguish useful ideas from incompatible product/runtime models.
Record adopted ideas and reasons, rather than importing another platform's
architecture by analogy. No research has been performed for this note; it is
not a new current-phase gate, background job or commitment to copy code.

### SDK Authorship Investigation Input

Owner note, 2026-09-04: before the relevant SDK authoring design work, locate
the "SDK design update" document and related specifications/essays under the
owner's Documents projects area and RAWR folder. The exact path and whether
earlier specification work incorporated it were initially unverified. The strongest
match is now located at
`/Users/mateicanavra/Documents/Projects/RAWR/_inbox/RAWR_SDK_Ergonomics_Change_Doc.md`.
No explicit citation/disposition was found in the realignment materials; prior
awareness remains unverified. Inspect its
provenance and prior dispositions before using it; some surrounding material
is outdated. This is a specification-update proposal to evaluate, not a new
superseding authority or an instruction to reopen the whole architecture.

Carry these questions into tasks 8.3, 10.1, 13.1-13.5 and 14.1-14.2 when their
actual authoring boundary is designed:

- Normalize plugin/service authorship so it feels Habitat-native while honoring
  the selected providers' required abstractions and familiar behavior.
- Start from the current native provider semantics, particularly Inngest for
  async. Keep internal integration in the actual vendor language. Elevate useful
  semantics in the Habitat authoring layer without requiring vendor branding in
  every author-facing concept. Diverge only for a demonstrated simpler/better
  authoring experience or a real multi-provider need, not speculative neutrality.
- Run bounded semantic ablations: what fails or becomes harder if a distinction
  is removed or collapsed? Retain, simplify, add or refine concepts from that
  evidence. Treat a worthwhile discrepancy as a design/research loop with native
  proofs, not an automatic architecture rewrite or a reason to stop execution.
- Requisite variety is a core Habitat principle, philosophically and in software
  and infrastructure. Preserve the variety needed to handle actual demands;
  do not equate that with maximizing concepts, vocabulary or implementation
  machinery. This interpretation must be tested against the source material and
  real authoring examples, not promoted from this note alone.

Root DRA owns retrieval and disposition at the first affected authoring task;
vendor-specific and authoring/UX peers review the concrete examples. Record what
was already incorporated, what is adopted, what is superseded and why. The note
is deliberately durable here rather than transcript-only memory. It does not
interrupt cold-pipeline admission or resume Civ7/Magic product work.

Initial disposition: direct maps, avoiding redundant wrappers, projected typed
capabilities and keeping execution machinery out of ordinary authoring are
useful ergonomics inputs. The proposed replacement of `useService` must account
for its now-real instance/binding semantics before any removal. The proposal's
unified service/descriptor execution spine and rejection of native `.handler`
are superseded by current official oRPC ownership. It supplies neither the
`effect/context` nor `effect/wrap` implementation contract and is not a reason
to invent another runner. Related SDK layer/harness drafts remain contextual,
not wholesale architecture replacements.

Read this record, the current OpenSpec queue and the selected owner's authority.
Admit each complete verified story through Graphite. Request one native stack
merge when its candidates are green and sweep consumed branches only after
actual merge. Continue from the native server into complete async qualification,
using the SDK authorship inputs and native contracts at each actual boundary.
Consumer repositories and held source remain outside this authorization.
