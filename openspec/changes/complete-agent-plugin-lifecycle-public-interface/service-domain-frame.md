# Agent-Plugin Lifecycle Service Domain Frame

## Status

`CONTROLLING_SERVICE_BURN_DOWN`

This frame extracts the product semantics that the lifecycle implementation
must preserve before its source topology changes. It is an execution record
inside this OpenSpec change, not a second normative design. [[authority-amendment]]
controls product authority, [[design]] controls the target architecture, and
[[tasks]] controls checkpoint order.

## Service Charter

**Entity:** one invocation of the Template-owned agent-plugin lifecycle service.

**Boundary:** the service accepts typed lifecycle requests, applies lifecycle
policy, calls ready resource capabilities, and returns closed results. It owns no
durable lifecycle state.

**Decision improved:** whether explicit Personal Git content is eligible,
packageable, or converged in explicit native provider homes, and which bounded
mutation is lawful when it is not.

**Admitted initial condition:** every repository, selection, output, provider
home, and disposable root is explicit input. Required resource capabilities are
ready before the owning handler begins. Ordinary tool resolution belongs to the
owning resource and process environment, not the lifecycle request.

**Promised property:** for one invocation, the result names what was observed,
what was refused, and the confirmed effects relevant to that operation.
Canonical convergence and owner-specific converged outputs may inspect but do
not mutate when repeated against unchanged desired and external state.

**Environment:** Personal Git may change between observations; provider commands
may fail or return uncertain outcomes; explicit output and provider-home state
may be changed by other processes. The service revalidates at its commit
boundaries and never upgrades incomplete observation into success.

**Transition authority:** Personal review selects desired content. Lifecycle
policy selects a lawful operation. Resource providers perform filesystem, Git,
archive, and native-provider mechanics. The explicit workspace, output, or
provider home owns the resulting state.

**Federation decision:** this is one service with five capability modules, not
one global status machine. Git selection, vendor authoring, package publication,
and each provider home have different state owners and transition laws. The
service composes them through explicit requests and results without inventing a
shared lifecycle store.

## Cohesion Decision

The service remains one domain owner. Releases, Governance, Packaging,
Providers, and Vendors consume coordinated subsets of one admitted release
domain: exact Git selection, release input, payload, ownership, release and
complete-set identity, and current-main selection. Governance and Providers
share current-main selection; Releases, Packaging, and Providers share release
derivation; Vendors consumes the root release-input model while applying its
owner-local authoring policy. Their differing dependency sets and mutation
destinations are real, but those destinations are resource-owned mechanics and
external state authorities. They do not establish independent service meaning.

The split and keep reviews agreed on the concrete defect: the CLI host eagerly
constructs the complete concrete resource set before invoking one operation.
They differed on whether that fat host assembly falsified the service boundary.
Change coupling resolves the question. Release derivation, clean-content
policy, current-main selection, and release-input meaning intentionally cross
module branches and have changed together. Splitting along destination lines
would duplicate this kernel, expose it as a new shared package, or introduce
service calls across the strongest collaboration in the domain.

The corrective boundary is therefore outside the service. The CLI app owns one
cold profile of exact provider factory references. After command input is
admitted, the command materializes ready dependencies once, constructs one
local service client with fixed construction context, and invokes one selected
operation. The resources retain their existing operation-local acquisition and
cleanup. Oclif command projections and the service import no concrete
providers. The service continues to receive ready capabilities through its
root context and each module continues to curate its terminal operation
vocabulary.

This decision has three falsifiers:

- a branch acquires an independent semantic model and change cadence;
- a qualified consumer needs that branch without the shared release truth; or
- the outcome requires durable cross-owner sequencing beyond one request.

Any of those findings reopens placement; it does not predetermine a sibling
service rather than a plugin or workflow. Different output paths, module size,
or a root context that truthfully declares complete host requirements do not.

The bounded lifecycle handoff includes the canonical TypeBox Standard Schema
adapter and the CLI's cold app-owned lifecycle profile. Canonical `main`
contains the native-validator, message-only bridge correction at
`0854024afe9a76ef0ae4ae3f427182be25fe8420`, its current
`@rawr/typebox-adapter` package owner at
`3b142e560f3b3cefa255356fa7343c56cac18d99`, and the bounded CLI vertical
landed at `a25f72da1505f90206c6ff14bcb0ab5de77cbbec`. The adapter returns
message-only issues because TypeBox `1.3.8` paths are ambiguous. One real Oclif
command consumes a local ready lifecycle-service client while the app profile
owns concrete selection and each operation keeps its existing resource
lifetime.

The downstream research design additionally requires a production compiler,
bootgraph, process-runtime binding, and harness boundary. Those are consumer
dependencies owned by the separately governed runtime-realization migration,
not unfinished lifecycle work. The lifecycle checkpoint therefore does not
authorize downstream research BUILD or restack. Its exact integration handoff
is recorded in [[README#CLI Production Profile Handoff]]; a consumer requiring
the wider runtime remains held until a separately accepted, production-owned
Parent-Repo Migration authorizes that boundary.

## Authority Ledger

| Concern | Truth owner | Lifecycle role |
| --- | --- | --- |
| CLI discovery and dispatch | Installed Oclif application | Expose one typed command projection |
| External CLI extensions | `@oclif/plugin-plugins` | None |
| Curated desired membership | Reviewed Personal `current-main` and release-input records | Validate and derive |
| Selected content bytes | Exact Personal Git commit and tree objects | Read through the content-workspace port |
| Release and complete-set model | Invocation-local derivation | Validate completeness and unique ownership |
| Vendor source state | Explicit Personal content workspace | Inspect or author reviewable changes |
| Vendor upstream facts | Caller-declared repository identity and ref | Observe through the versioned-content resource |
| Package state | Explicit caller-selected output file | Render, revalidate, publish, verify |
| Codex installed state | Live native Codex inventory in one explicit home | Inspect, plan, invoke native commands, verify |
| Claude installed state | Live native Claude inventory in one explicit home | Inspect, plan, invoke native commands, verify |
| Disposable test state | Explicit disposable root and descendant homes | Create for one invocation and retire together |
| Operational evidence | Returned result or ordinary CI/release artifact | Return facts; persist nothing |

A repository path is only a locator. A digest is an invocation-local
verification value unless a named external format requires it. Neither becomes
CLI identity, provider identity, lookup state, or authority for the next
invocation.

## Capability Set

Exactly five modules compose the service. The twelve admitted operations all
have qualified operator or CI consumers; retaining them does not let an
adjacent capability select a channel or claim installed state.

| Module | Operations | Capability | External state owner |
| --- | --- | --- | --- |
| `governance` | `currentMainRecord`, `currentMainSelection` | Encode or validate the channel record and resolve one reviewed selection | Personal Git |
| `releases` | `releaseInputRecord`, `refreshReleaseInput`, `checkRepository`, `check` | Encode or validate release input, inspect staged or clean source, and derive a targeted release or complete set | Personal Git or staged workspace |
| `vendors` | `status`, `update` | Inspect declared upstreams and author reviewable vendor changes | Personal workspace |
| `packaging` | `package` | Render one deterministic `cowork-v1` file from selected content | Explicit output file |
| `providers` | `status`, `test`, `sync` | Inspect or reconcile explicit Codex and Claude homes through native commands | Each native provider home |

`rawr agent plugins create` remains separately owned source authoring. Export is
a separate destination capability and remains outside this service correction;
it is not deleted merely because the legacy export module is absent.

## Operation Admission

The task 5.1 consumer audit admits the complete twelve-operation set:

| Operation group | Qualified consumer | Why it remains |
| --- | --- | --- |
| Release eligibility and repository checks | `rawr agent plugins check --mode release|repository-staged|repository-clean` | Personal authoring and CI need one non-publishing eligibility boundary |
| Release-input encode, validate, and refresh | `rawr agent plugins check --mode release-input-record|release-input-refresh` | Personal authoring and CI need canonical release-input bytes before Git review |
| Current-main encode, validate, and selection | `rawr agent plugins check --mode current-main-record|current-main-selection` | Personal governance needs canonical record bytes and selection verification before review |
| Vendor observation and update | `rawr agent plugins status vendors` and `rawr agent plugins update vendors` | Content maintainers need read-only upstream status and reviewable workspace authoring |
| Deterministic packaging | `rawr agent plugins package` | Callers need one explicit package artifact without channel or provider authority |
| Native provider status, test, and sync | `rawr agent plugins status|test|sync` | Operators and CI need live inspection, disposable verification, and approved-home convergence |

Each command invokes exactly one typed service operation. There is no hidden
aggregate, alias, compatibility command, or operation whose only consumer is
historical settlement machinery.

## Structural Authority Correction

The initial lifecycle consolidation copied the service blueprint packet but did
not make its complete rule set part of the required Nx source-law gate. Later
implementation and review therefore treated Habitat as an optional checker
around an already-chosen source tree instead of as the constructor of the
allowed service design space. That was a categorical implementation-direction
error. Earlier green Habitat results did not prove the complete service law
because the required gate omitted the topology, module-isolation, context, and
oRPC-composition rules.

The corrected use of Habitat is positive and closed:

- the service package, public source face, service spine, module shell, and
  named model layers enumerate the complete set of admitted children;
- every layer exposes a concrete interface to its parent and owns only the
  decisions that can be made with that layer's local context;
- dependencies and ready capabilities seed the service boundary; qualified
  root middleware may acquire, guard, or enrich execution capabilities, and
  every module curates its smallest route vocabulary from inherited lanes;
- root service model matter exists only when it is genuinely used across
  modules; module domain matter remains in the owning module;
- TypeBox owns structural data contracts, oRPC owns operation boundaries, and
  resources own external mechanics;
- `shared`, `common`, parallel schema barrels, sibling-module imports, and
  upward implementation imports have no admitted location; and
- a missing location is a design refusal, not permission to add a new bucket or
  weaken the blueprint.

Native oRPC context composition is additive. A `.use<Context>` type argument or
source-spelling blacklist cannot make it subtractive. Terminal module curation
closes the vocabulary against which handlers author without pretending the
inherited lanes disappeared. Named middleware exists only for qualified
acquisition, guards, or enrichment; it is not a projection layer. Adding a
capability may add a named module, middleware, or model category through the
same hierarchy, but it cannot reopen a generic holding area or let an inner
layer acquire runtime authority directly. As a result, an author working inside
one module needs that module's contract, curated capability surface, model,
operations, and the public interfaces it consumes, not the full service
implementation.

The latest committed Magic Migration service blueprint is the structural
source. Template retains only explicitly independent RAWR extensions that do
not weaken or duplicate that packet. The required Nx source-law target must
invoke the complete service packet serially. Empty baselines remain empty; no
path exception, legacy inventory, or owner-specific forbidden list may make an
invalid service green. See [[tasks#5. Bounded Agent-Plugin Lifecycle Service|task
5.7e]].

## Shared Domain Collaborations

Only two executable domain-policy collaborations cross module boundaries:

1. **Current-main selection** verifies the governed Personal record and returns
   one canonical repository, ref, commit, tree, and release-input selection.
   Governance's operation and provider operations call the same service-owned
   model function.
2. **Release derivation** reads exact selected Git objects and returns one
   closed, immutable, invocation-local release observation for a targeted member
   or the complete set. Release, packaging, and provider operations call the
   same service-owned model function.

These collaborations belong to the service model because their meaning and
invariants span the service capability suite, not merely because multiple
modules consume them. Each consists of TypeBox-owned domain structure plus one
service-owned policy over explicit public resource ports. Module requests,
results, issues, router handlers, and mutation policy remain with the owning
module. The optional service `db` boundary owns only service persistence under
its separately closed database blueprint; concrete outside acquisition and
mechanics remain in resources and providers. A shared collaboration is not an
injected host-domain
implementation, nested router call, persistent repository, root-to-child
import, or permission for siblings to import one another.

The root release-input schema and policy are shared domain model rather than a
third executable collaboration. Releases owns its public admission and refresh
operations; Vendors reads and rewrites the same model only through its
owner-local authoring policy.

Provider-selected content is not a third shared collaboration. Providers alone
consumes its exact Git payload, native marketplace, and selection-result
meanings, so it owns the DTOs and pure policy. Status, test, and sync sequence
the ready content-workspace resource in their handlers and pass only typed
facts into that policy. No selected-content resolver, narrowed port, or
service-root Provider meaning sits between the operations and the resource.

## Target Topology

The imported Magic Migration service law fixes the container before business
logic moves:

```text
src/service/
  base.ts
  contract.ts
  impl.ts
  router.ts
  middleware/
    <capability>.ts
  model/
    dto/
    entities/
    helpers/
    policy/
    ports/
  modules/
    <module>/
      contract/
        index.ts
        <operation>.ts
      module.ts
      router.ts
      router/
        <operation>.router.ts
      middleware/
        index.ts
        <capability>.ts
      model/
        dto/
        entities/
        helpers/
        policy/
        ports/
```

Each directory below `model/` exists only when its owner has corresponding
domain matter. A module exposes one `contract/index.ts`, authors operations in
named `router/*.router.ts` leaves, and composes them through one module-root
`router.ts`. Optional module middleware uses its indexed catalog shape.
Service-root middleware is the
intentional exception: it consists only of direct kebab-case leaves exporting
`middleware`, imported by semantic alias and attached in `impl.ts`, with no
barrel. TypeBox schemas are colocated with their DTOs or entities, and outside
capabilities are declared as model ports. Concrete acquisition and mechanics
remain in resources/providers. The service root has no `shared/` directory:
genuinely cross-module release and current-main concepts live in the root model,
while operation requests, results, issues, and policy stay in their module.
Root model policy may coordinate only the two service-owned collaborations over
context-provided ports. It cannot contain module behavior, concrete providers,
or another root-to-child bridge.

## Request And Context Flow

```text
Oclif command
  -> one typed lifecycle client operation
  -> ready host resource capabilities
  -> root context seed and cross-cutting telemetry
  -> one module branch
  -> module curates its route-facing capabilities
  -> oRPC applies the operation's TypeBox input boundary
  -> direct handler applies canonicalization and domain policy
  -> resource port performs external mechanics
  -> handler returns one closed result
  -> oRPC applies the operation's TypeBox output boundary
  -> typed client receives the result
```

The root imports module source only in `contract.ts` and `router.ts`. Each
module's `module.ts` is the sole file allowed to import `service` from
`../../impl`; it enters through the matching root branch and ends with the
terminal inline curation. Other module source imports only local files,
explicit owner-local service-model exports, or public resource contracts.
Modules never import siblings, root middleware, the raw base, or concrete
resource providers. A future named middleware boundary must own real
acquisition, guarding, or enrichment; projection alone does not justify a
factory or file.

TypeBox schemas own request, result, persisted JSON, and intermodule
collaboration structure and generate their TypeScript types. Opaque runtime
capability interfaces may remain TypeScript-only. Handlers and policy own
canonical ordering, digest calculation, uniqueness, cross-field semantics, and
transition decisions after structural validation. Canonical JSON decoding
remains valid; manually reconstructing TypeBox object, array, string, or integer
structure does not.

Provider tool names and paths are resolved by the native-provider resource from
the ordinary local process environment. The service receives ready native
session capabilities and explicit provider homes; it does not accept, validate,
or select an executable identity.

## Primary Flows

### Canonical Status

```text
current-main locator
  -> verify reviewed selection
  -> derive exact complete release set in memory
  -> preflight every explicit native home
  -> compare selected provenance, enablement, and files
  -> return Converged, Drifted, Blocked, or Failed
```

Status performs no repository, package, provider, Oclif, export, or lifecycle
state mutation.

### Canonical Sync

```text
status preflight for every target
  -> perform zero mutation everywhere when the provider selection is invalid
  -> classify target-specific preflight independently
  -> process targets in canonical order
  -> replace stale selected members through native remove/install/enable
  -> verify selected visibility
  -> retire only omitted members with verified same-home native provenance
  -> inspect final state
```

Unmanaged or ambiguous occupancy blocks mutation for that target without
falsifying another target. Partial failure returns confirmed native operations,
the uncertain attempt when present, and later `NotAttempted` targets only when
the operation cannot safely continue after mutation begins. Retry begins with
fresh native inspection; the service claims neither rollback nor hidden
recovery.

### Disposable Test

```text
explicit exact Git selection
  -> derive targeted or complete content
  -> materialize one transient marketplace below the disposable root
  -> reconcile explicit descendant homes without omitted-member retirement
  -> inspect final state
  -> retire the scoped marketplace before returning
```

Test does not select a channel, mutate an approved home, persist a receipt, or
leave a marketplace backed by a mutable content checkout.
Effect scope owns the one temporary child it allocated. The caller owns the
disposable parent and provider homes, so the service neither deletes nor claims
recovery authority over those paths. Allocation failure remains a typed
resource failure; a scoped cleanup failure remains an Effect finalizer failure
and cannot be reported as successful completion or invent a lifecycle record.

### Package

```text
exact Git selection
  -> shared release derivation
  -> deterministic archive encoding
  -> source revalidation
  -> guarded atomic replacement of one explicit regular output
  -> final byte verification
```

Unsafe outputs reject before mutation. An exact existing output returns
read-only convergence. Cleanup may unlink only the operation-owned same-parent
temporary regular file; recursive deletion is never required.

### Vendor Update

```text
explicit workspace and source IDs
  -> observe admitted and upstream state
  -> refuse held, diverged, invalid, or unavailable sources
  -> capture the owned workspace paths
  -> author one reviewable update
  -> verify and settle, or restore captured paths
```

The terminal result distinguishes read-only convergence, authored changes,
successful restoration, and unsettled restoration. It does not promote or
release content.

## Guarantees

- One complete selected set has exactly one distribution owner for every
  plugin, skill, alias, and provider-facing identity.
- Current-main binds canonical repository identity, tag, commit, tree, and
  release-input digest; newer unselected content has no effect.
- All status-like operations are read-only.
- Every mutating operation names its external state owner and commit boundary.
- Source or external-state changes detected before commitment refuse or
  reclassify rather than silently switching inputs.
- Native provider observation wins over caches, prior results, or caller belief.
- Invalid provider selection blocks every target; target-specific capability,
  collision, or observation results remain independent.
- Same-ID provider replacement completes and verifies the native refresh
  transition before omitted-member cleanup begins.
- Targeted and complete tests preserve omitted members.
- A repeated canonical convergence or exact package/vendor output performs zero
  mutation after its required observations.
- A repeated disposable test creates a fresh invocation-owned environment; it
  is deterministic and lifetime-bounded rather than globally mutation-free.
- Public results expose terminal classification, bounded issues, exact confirmed
  mutations, and uncertainty, not internal plan or event structures.
- No operation persists a release store, projection store, receipt, sidecar,
  evidence store, controller identity, or undo state.

## Failure And Idempotence Matrix

| Operation class | Refusal or failure boundary | Repeat guarantee |
| --- | --- | --- |
| Current-main record codec | Invalid structure, oversized or non-canonical bytes | Pure; identical input returns identical canonical bytes |
| Current-main selection | Wrong repository, unreachable selection, stale or forged record | Read-only |
| Release-input record codec | Invalid structure, ownership conflict, digest or canonical-byte mismatch | Pure; identical input returns identical canonical bytes |
| Release-input refresh | Invalid staged selection, source changed, protected or undeclared content | Read-only candidate; unchanged staged input returns byte-identical output |
| Staged repository check | Invalid staged selection, incomplete materialization, source changed | Read-only staged observation |
| Clean repository check and release check | Ineligible exact Git source, invalid release input, source changed | Read-only exact Git observation |
| Vendor status | Invalid declaration or unavailable upstream | Read-only |
| Vendor update | Held/diverged/invalid source, authoring failure, restoration failure | Converges read-only or reports exact changed/restored/unsettled paths |
| Packaging | Invalid selection, unsafe output, changed source, encode/publish/verify failure | Exact output is not rewritten |
| Provider status | Invalid selection, collision, capability or observation failure | Read-only |
| Provider test | Invalid disposable containment, collision, native failure, cleanup refusal or failure | Fresh bounded environment; no omitted cleanup or lifecycle record |
| Provider sync | Invalid selection, collision, native failure, uncertain command, final verification failure | Fresh inspection; converged state produces no mutation |

## Burn-Down Design

The current code preserves most required behavior but violates the intended
dependency direction and duplicates structural authority. The correction is
in-place and deletion-first:

| Current defect | Destination | Semantic checkpoint |
| --- | --- | --- |
| Governance routers forward into root-owned governance implementation | Governance owns its DTO, schema, policy, port, and direct handlers; only the canonical selection collaboration remains service-owned | Seal governance |
| Package exports the broad release implementation | CLI consumes one narrow public input boundary; release implementation remains private | Narrow package exports |
| Manual release parsers duplicate TypeBox | TypeBox validates structure once; canonicalization and semantic checks remain | Normalize release model by family |
| Release derivation has competing check/package paths | One service-owned release-derivation policy over the content-workspace port serves Releases and Packaging | Seal shared derivation |
| Provider status and sync delegate channel selection to a resolver and narrowed read port | Their oRPC handlers sequence the ready content-workspace resource directly and pass typed facts into Provider policy | Delete the false intermediate owner |
| Modules import root `base.ts` and siblings | `module.ts` uses only the matching `impl` branch and terminally curates its route vocabulary; all other edges stay owner-local or public | Seal each module |
| Module operations delegate to parallel business entrypoints | Direct oRPC handlers own sequencing and call only pure policy or ready capabilities | Seal each router |
| Root requires owner-specific capabilities for every operation | Host seeds ready resources; each module curates the exact vocabulary its handlers use; qualified middleware remains only for acquisition, guards, or enrichment | Seal context authoring |
| CLI requests carry provider executable identities | Native-provider resources resolve ordinary `codex` and `claude` tools from the process environment; tests inject providers at construction | Remove executable binding |
| Provider tests encode provider-wide target preflight | Only invalid provider selection blocks every target; target-specific preflight and results remain independent | Restore target isolation |
| Provider test delegates local source selection to a runner and workspace resolver | Its oRPC handler authors source selection over ready context; pure policy alone is extracted. Native reconciliation remains a separately open operation-authorship cut. | Seal disposable source selection |
| Duplicate module telemetry adds no module fact | One cross-cutting service signal path; module telemetry exists only for a real owner-specific field | Compose root |
| Disposable test uses mutable workspace marketplace | Invocation-owned exact-Git marketplace below disposable root | Complete disposable lifetime |
| Service law is diagnostic only | Closed Habitat topology and source laws admit the complete service | Activate service law |

Checkpoint order is governance, narrow public release boundary, TypeBox release
families, shared derivation, releases, vendors, packaging, providers,
root composition, then full service/CLI integration. Each checkpoint removes
the old reader and writer together and runs owner-local behavior, type, and
relevant Habitat checks before it lands.

Behavioral verification crosses the typed client and module router boundary.
Habitat alone verifies topology and source relationships. A shared current-main
checkpoint exercises governance plus provider selection; a shared release-
derivation checkpoint exercises Releases plus Packaging.
No aggregate schema walker or direct call to a parallel `run*` helper counts as
operation proof.

### Ownership Family

Ownership is a pure release-domain value, not a service, resource, repository,
or state owner. Its closed flow is:

```text
curated member IDs + declared non-plugin claims
  -> synthesize one plugin claim per member
  -> validate member ownership and namespace uniqueness
  -> sort kind, identity, owner
  -> immutable distribution ownership index
  -> canonical release-input/set projection and read-only claim selection
```

TypeBox owns the full and declared claim-kind sets, closed claim records,
bounded claim arrays, the ownership-index record, and their generated types.
The domain implementation owns only synthesized plugin claims, the total
post-synthesis bound, canonical ordering, defensive immutability, member
coverage, duplicate/conflict classification, and the shared plugin/alias
routing namespace.

The family guarantees:

- release-input declarations cannot manufacture plugin claims;
- every curated member has exactly one plugin claim whose identity equals its
  plugin ID;
- every claim owner is a curated member;
- each `(kind, identity)` has one owner and appears once;
- plugin IDs and aliases cannot make routing ambiguous, while unrelated claim
  namespaces remain independent;
- claim and issue ordering is independent of declaration order;
- exact protocol bounds are admitted without traversing an over-bound
  collection; and
- the derived index is immutable invocation-local release data, never
  lifecycle authority or persisted controller state.

Ownership structure failures intentionally produce one owner-local
`EXPECTED_OBJECT` diagnostic at the ownership boundary instead of
reconstructing ambiguous TypeBox paths or retaining a second manual structural
parser. Existing bounded-array diagnostics remain exact, and release operation
terminal classification is unchanged.

The ownership checkpoint stops rather than widening if it requires moving skill
inventory closure out of release-input policy, changing claim kinds or
collision semantics, adding a generic schema-error framework, changing public
terminal outcomes, or touching payload, release, release-set, provider, oRPC,
Effect, or resource structure. See
[[tasks#5. Bounded Agent-Plugin Lifecycle Service|task 5.7d]].

## Exterior

- custom controller distribution, selector, release store, and launcher;
- external Oclif extension mechanics;
- app, web, and runtime-platform composition beyond the bounded CLI production
  profile and local service binding required for command integration;
- legacy destination realization inside the lifecycle owner; export remains a
  retained capability under the dedicated destination architecture;
- promotion, undo, hosted approval, and provider-wide coordination;
- Personal executable implementation or Template/Personal tree equivalence;
- adversarial local-tamper machinery;
- protected Inngest materialization or release.

## Falsifiers

Stop the affected checkpoint if it requires another service identity without
independent domain truth, a module without a coherent subdomain, durable
lifecycle storage, a sibling-module import, a root-to-child implementation
import, direct provider-home writes, an Oclif mutation, a second schema
authority, Personal executable code, legacy destination implementation inside
this service, runtime composition inside this service change, or a changed
public terminal classification without an explicit product decision. A sixth
module or a large handler is not itself a falsifier.

## Completion

The service slice is complete when every admitted module satisfies the
Habitat service law, TypeBox is the sole structural authority, each operation
authors only against its named capability surface after broad dependency lanes
are removed at their resource and handler owners, the twelve qualified
behaviors remain green through the typed client, disposable test material
shares one bounded lifetime, and the root composes the sealed module contracts
and routers without reversed or sibling dependencies.

## Related

- Product authority: [[authority-amendment]]
- Architecture: [[design]]
- Execution and checkpoint status: [[tasks]]
- Live initiative record: [[README]]
