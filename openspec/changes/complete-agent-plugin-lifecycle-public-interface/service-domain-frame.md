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

## Authority Ledger

| Concern | Truth owner | Lifecycle role |
| --- | --- | --- |
| CLI discovery and dispatch | Installed Oclif application | Expose one typed command projection |
| External CLI extensions | `@oclif/plugin-plugins` | None |
| Curated desired membership | Reviewed Personal `current-main` and release-input records | Validate and derive |
| Selected content bytes | Exact Personal Git commit and tree objects | Read through the content-workspace port |
| Release and complete-set model | Invocation-local derivation | Validate completeness and unique ownership |
| Vendor source state | Explicit Personal content workspace | Inspect or author reviewable changes |
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

## Shared Domain Collaborations

Only two domain collaborations cross module boundaries:

1. **Current-main selection** verifies the governed Personal record and returns
   one canonical repository, ref, commit, tree, and release-input selection.
   Governance's operation and provider operations call the same service-owned
   model function.
2. **Release derivation** reads exact selected Git objects and returns one
   closed, immutable, invocation-local release observation for a targeted member
   or the complete set. Release, packaging, and provider operations call the
   same service-owned model function.

These collaborations belong to the service model because multiple modules
consume them. Each consists of TypeBox-owned domain structure plus one
service-owned policy or repository implementation over explicit public resource
ports. Module requests, results, issues, router handlers, and mutation policy
remain with the owning module. A shared collaboration is not a sixth module,
injected host-domain implementation, nested router call, persistent repository,
root-to-child import, or permission for siblings to import one another.

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
  model/
    dependencies/
    dto/
    policy/
    repositories/
  modules/
    <module>/
      contract.ts
      module.ts
      router.ts
      middleware/
      model/
        dto/
        policy/
        repositories/
```

Each directory below `model/` exists only when its owner has corresponding
domain matter. A module has one flat `router.ts` composition boundary, not a
second `router/` container. Module middleware is a directory of named
middleware files, not a top-level `middleware.ts`; TypeBox schemas are
colocated with their DTOs and repositories remain below the owning model. The
service root has no `shared/` directory:
genuinely cross-module release and current-main concepts live in the root model,
while operation requests, results, issues, and policy stay in their module.
Root `model/repositories/` may contain only adapters that implement the two
service-owned collaborations over public resource contracts. It cannot contain
module repositories, concrete providers, or another root-to-child bridge.

## Request And Context Flow

```text
Oclif command
  -> one typed lifecycle client operation
  -> ready host resource capabilities
  -> root context validation and cross-cutting telemetry
  -> one module branch
  -> owner middleware projects only that module's capabilities
  -> oRPC applies the operation's TypeBox input boundary
  -> direct handler applies canonicalization and domain policy
  -> resource port performs external mechanics
  -> handler returns one closed result
  -> oRPC applies the operation's TypeBox output boundary
  -> typed client receives the result
```

The root imports module source only in `contract.ts` and `router.ts`. Each
module's `module.ts` is the sole exception allowed to import `service` from
`../../impl`; it enters through the matching root branch. Other module source
imports only local files, explicit owner-local service-model exports, or public
resource contracts. Modules never import siblings, root middleware, root
`base.ts`, or concrete resource providers.

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
  -> perform zero mutation everywhere when the shared selection is invalid
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
  -> retire marketplace and homes as one invocation-owned lifetime
```

Test does not select a channel, mutate an approved home, persist a receipt, or
leave a marketplace backed by a mutable content checkout.
Cleanup verifies exact invocation ownership and containment before removal.
Unsafe cleanup refuses rather than deleting; the result reports bounded
remaining paths and cleanup failures without inventing a lifecycle record.

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
- Invalid shared selection blocks every target; target-specific capability,
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
| Governance routers forward into root-owned governance implementation | Governance owns its DTO, schema, policy, repository adapter, and direct handlers; only the canonical selection collaboration remains service-owned | Seal governance |
| Package exports the broad release implementation | CLI consumes one narrow public input boundary; release implementation remains private | Narrow package exports |
| Manual release parsers duplicate TypeBox | TypeBox validates structure once; canonicalization and semantic checks remain | Normalize release model by family |
| Release derivation has competing check/package/provider paths | One service-owned release-derivation policy over the content-workspace port serves all three modules | Seal shared derivation |
| Root selected-content middleware imports release implementation | Each consuming handler calls the shared service-model policy with its projected content-workspace capability | Delete reversed root edge |
| Modules import root `base.ts` and siblings | Direct module anchor, owner-local middleware, service-model alias, and public resource ports only | Seal each module |
| Module operations delegate to parallel business entrypoints | Direct oRPC handlers own sequencing and call only pure policy or ready capabilities | Seal each router |
| Root requires owner-specific capabilities for every operation | Host binds ready capabilities; module middleware exposes only the exact handler context | Narrow context |
| CLI requests carry provider executable identities | Native-provider resources resolve ordinary `codex` and `claude` tools from the process environment; tests inject providers at construction | Remove executable binding |
| Provider tests encode provider-wide target preflight | Only invalid shared selection blocks every target; target-specific preflight and results remain independent | Restore target isolation |
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
derivation checkpoint exercises releases plus packaging and provider consumers.
No aggregate schema walker or direct call to a parallel `run*` helper counts as
operation proof.

## Exterior

- custom controller distribution, selector, release store, and launcher;
- external Oclif extension mechanics;
- app, web, and runtime composition;
- destination/export realization;
- promotion, undo, hosted approval, and provider-wide coordination;
- Personal executable implementation or Template/Personal tree equivalence;
- adversarial local-tamper machinery;
- protected Inngest materialization or release.

## Falsifiers

Stop the affected checkpoint if it requires a sixth lifecycle module, another
service identity, durable lifecycle storage, a sibling-module import, a
root-to-child implementation import, direct provider-home writes, an Oclif
mutation, a second schema authority, Personal executable code, export
implementation, app/runtime composition, or a changed public terminal
classification without an explicit product decision.

## Completion

The service slice is complete when all five modules satisfy the admitted
Habitat service law, TypeBox is the sole structural authority, each operation
uses only its exact projected context, the twelve qualified behaviors remain
green through the typed client, disposable test material shares one bounded
lifetime, and the root composes the sealed module contracts and routers without
reversed or sibling dependencies.

## Related

- Product authority: [[authority-amendment]]
- Architecture: [[design]]
- Execution and checkpoint status: [[tasks]]
- Live initiative record: [[README]]
