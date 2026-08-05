## Context

RAWR HQ-Template `main` at
`b7a98c567f4519e5d84229fafacd0a4179875c9c` contains a working native-provider
agent-plugin lifecycle service wrapped in a custom CLI distribution and custom
Oclif extension manager. The installed distribution manifests 18,568 entries,
is approximately 238 MiB per retained release, and selects among retained local
copies through a digest pointer. Those properties were never necessary to keep
CLI execution independent from a source checkout.

The accepted packet remains provenance at Personal commit
`cc631f60c9254802be647d66662823ae47d5e7db`, project tree
`97f0a634fcd8d1d24d4a95fcb57d277e9bf75ae3`. The repository-separation
correction remains controlling at Personal commit
`43a49d48ab6c6a29b4877f20576b42b533fc82ba`, blob
`10bb040317d62834806b86b36a3a14f13c539fbc`. Neither identity authorizes
Template implementation in Personal or a custom Template distribution.

The categorical correction and working vocabulary are in
[[authority-amendment]]. The implementation-level service charter, capability
map, transition guarantees, and burn-down sequence are in
[[service-domain-frame]].

## Architecture

```text
                         RAWR HQ-Template

  .habitat + private runtime owners -> Nx build -> @habitat-ai/sdk -> npm
                                              \-> @habitat-ai/cli -> npm / nx add

  private RAWR Oclif app -> `rawr plugins` ------> @oclif/plugin-plugins
                         \-> `rawr agent plugins` -> oRPC lifecycle
                                                       |
                                           closed Personal release input
                                                       |
                                       exact Git -> in-memory release model
                                                       |
                                         native Codex / Claude commands
                                                       |
                                            explicit provider home

                         Personal RAWR HQ

  curated content + provenance + policy/evaluation + governed records
```

The wires stay visible. The private `rawr` application composes Oclif plugins. Command plugins
project CLI input/output onto public service clients. Services own domain
behavior. Resources expose host capabilities. Providers implement those
capabilities. Nx builds the workspace and releases only the Habitat SDK and CLI
packages. Habitat constrains component topology.

## Decisions

### Oclif owns the CLI

The private `rawr` application under `apps/cli` has one ordinary entrypoint and
one binary declaration. Development invocation and packaged invocation run the
same Oclif application. Core
first-party plugins are declared in `package.json#oclif.plugins`. The official
`@oclif/plugin-plugins` package is a core plugin and directly owns install,
update, remove, link, and list for external Oclif extensions.

RAWR does not disable Oclif user/dev/JIT loading and reconstruct it through a
second registry. It does not wrap official plugin commands in local command
classes. `rawr plugins` is externally extensible CLI mechanics; it never selects
curated agent content.

The command root used for TypeScript development and the compiled command root
used for packaging are explicit. Each Oclif package owns its discovery
configuration and may emit its own `oclif.manifest.json` cache. Generated
manifests are build artifacts, not core-membership declarations or runtime
authority records.

### Nx owns build; Habitat owns the SDK and CLI

Nx projects declare build, typecheck, behavior test, and generated-manifest
targets. One workspace target owns ordinary lint. Habitat will be distributed as one
runtime SDK containing the TypeBox bridge, blueprint catalog, and runtime
capabilities, plus one ordinary Oclif CLI release consuming that SDK. Consumers
install it through `nx add @habitat-ai/cli`. The private `rawr` application and
its internal Template dependency graph remain private workspace projects and
are not members of an Nx release group.

Project kind does not permanently prohibit publication. A future Habitat
service, resource, plugin, or package may become a supported public artifact
through an explicit product decision, Nx release classification, and ordinary
package metadata; workspace membership alone never implies publication. This
change neither reserves nor authorizes a public `rawr` distribution.

Under this architecture the `rawr` application and command namespace remain
Nx-built internal tooling and MUST NOT be versioned, promoted, published, or
installed as a distribution. Any future first-class RAWR product requires a
separate authority amendment rather than an escape hatch in this lifecycle;
it MUST NOT expose the private workspace graph or reintroduce a local selector,
retained private release store, or per-file runtime envelope.

Habitat release integrity remains ordinary npm integrity, provenance, package
inventory, and installed behavior. RAWR app behavior is verified from its Nx
and Oclif owners without constructing or publishing an internal package cohort.
Per-file hostile-local-tamper attestation, custom archive canonicalization, and
registry emulation remain out of scope.

### Habitat owns positive architecture policy

Habitat `structure.toml` files declare closed valid topologies. Grit patterns
declare source relationships. Nx declares project imports, task dependencies,
inputs, outputs, and release ordering. Behavior tests remain behavior tests.

[[README#Habitat Provenance]] is the single commit-and-tree ledger for the
historical imports, current Magic service lineage, and queued shared laws:

- service spine and module topology;
- generic anchor exports and native oRPC ownership hops;
- context boundaries and module isolation;
- declarative TypeBox input/output schemas and module-owned oRPC errors;
- API plugin boundary;
- agent-router source shape and the repository-owned cross-kind placement
  relation.

RAWR preserves that positive topology and its owner relationships while
qualifying packet identity, the canonical TypeBox bridge, and Template's
stronger entity, metadata, package-manifest, and module-router documentation
law. Each module exposes a closed `contract/` catalog through its sole
`index.ts` composition face, authors operations in named
`router/<name>.ts` leaves, and composes those operations through one
module-root `router.ts` face. Optional module middleware uses the equivalent
indexed catalog; root contract and router composition remain in `contract.ts`
and `router.ts`, while optional service-root middleware remains a direct leaf
set without a barrel. Operation logic remains in oRPC router leaves alongside
owner-qualified model categories rather than moving into another
implementation container.

The generic agent-router blueprint owns document shape. Repository placement
lives under `rawr/repository` because it relates heterogeneous package and
service-module roots without defining any of their constructible topologies.

Template owns one checked-in Codex hook composition. Generic workstream hook
sources remain in their tool package and are invoked directly. Habitat's native
Nx initializer installs Husky for Git-hook activation and supplies a default
consumer pre-push check without owning repository-specific event policy. No
repository-local hook installer may replace that vendor path or create another
hook source copy. Stop-time feedback is narrower than repository admission,
which remains the pre-push and protected-CI responsibility.

The API-plugin boundary is active now rather than waiting for the wider service
corpus migration. Its closed source faces are `client.ts`, `api.ts`, and one
embedded service; outward documentation calls the API members operations.
The independent Grit-helper documentation law is also active and requires a
semantic comment immediately above each named helper. The Template-owned
Habitat Nx plugin discovers these laws from the application catalog and
projects them into their qualified owners' inferred policy targets. The one
root Nx scheduler graph
reaches repository admission and separation, Habitat policy, and CLI Oclif
parity through those owners. The inferred targets include the required Oclif
structure laws and lifecycle command-channel law. The six service-construction
rules are enforced together in the task 5.7e22 candidate after the complete
live-corpus burn-down; that task remains open until owner checks, standing
review, required admission, and canonical landing prove the candidate.
Public-consumer sealing remains outside
service-local v3 application until resolution can acquire foreign consumers
across the workspace.

RAWR adds generic Oclif app and command-plugin blueprints. These assert the
kind's valid axes, not a list of retired filenames. A broad universal “plugin”
rule is not invented without a stable common corpus.

The definition-only v3 checkpoint checks in seven root records: `package`,
`resource`, `provider`, `service`, `plugin`, `plugin-nx`, and `app`. The source
catalog schema-admits them, but they have zero instances, zero resolved
applications, and no released-pack acceptance; the released 33-rule v2
registry remains the sole execution authority. Only the `package@1` `contract`
and `semantics` proof-axis mapping is frozen, and that kind remains outside
release-pack acceptance until exact selected-member equality is proven. Every
other kind's proof axes remain candidates. Blueprint-declared
root relations are not yet enforceable: manifests can name `project` and
`source` independently even where service, app, and plugin structures require
exactly `source = project/src`. Release-pack acceptance and instance activation
must derive or positively bound that relation rather than trusting two unrelated
paths.

The first `@habitat-ai/blueprints` pack has no precommitted accepted set. It cannot
promise `package@1` before exact-member closure, activate a definition before
its root relations are bounded, or promise the six service-construction laws
before source migration and a green complete corpus. Public-consumer sealing
also requires the workspace acquisition described in
[[HABITAT_BLUEPRINT_VARIANT_CAPABILITY_HANDOFF]]. See
[[README#Habitat Blueprint Definition Checkpoint]] and
[[docs/projects/shared-habitat-substrate/CORPUS#Definition Checkpoint|the controlled corpus]].

The Civ7 `habitat-cli-v0.1.0` release and reviewed source
`d51e8c7454e301bcaba56c8364f5c714d5febca3` are historical transfer evidence.
Template owns the Habitat product source and the `@habitat-ai/cli` release
identity, but those are different boundaries. Habitat source follows the
ordinary resource, provider, service, plugin, app, runtime, and entrypoint
funnel; no composite package is allowed to own all of those kinds. The Oclif
app assembles one release artifact. The Nx plugin resolves admitted
applications, derives exact inputs, and owns caching plus owner-local policy
composition without acquiring service or provider authority. Workspace source
is dogfooded through those ordinary projects; publication and idempotent
consumer installation remain separately reviewed work.

### Required checks follow the Nx graph

The repository required result remains non-skippable for the candidate
revision. Its implementation stops running every project sequentially on every
local push.

Public `bun run check` starts one Nx scheduler graph over every admitted non-root
project's plain public check. Shared defaults connect those checks to one
workspace-owned `habitat:lint`, project-owned typecheck, optional owner
verification, Habitat policy, and dependency checks.
Repository separation, CLI Oclif parity, and Habitat topology/source policy
remain qualified owner work. Habitat's inferred owner targets contain the
required Oclif structure laws, lifecycle command-channel law, and public
boundary documentation law. The consumer-owned Stop hook invokes the Habitat
projection selected by repository configuration without becoming a second
admission graph. The required CI job
publishes one stable status. Local hooks provide fast feedback; remote branch
protection remains merge authority.

Every current non-root project owns a public check. The former packet-local Nx
project adapter and hand-maintained rule selector are deleted rather than
extended. The native workspace Grit rule owns the durable scheduler and single
lint-owner relationship; the Template-owned Habitat Nx plugin projects
resolved policy applications into that graph.

Foundational project-local target names are uniform across project kinds:
`build`, `typecheck`, `test`, and `check`; `lint` is workspace-owned.
`check:test` and `check:tools` are internal
typecheck leaves composed by the shared `typecheck` defaults; they are not
additional public CI lifecycles. Distinct native or packaged behavior uses a
qualified `acceptance:<capability>` target. Nx owns shared dependencies, cache
inputs, and outputs. A package script may own the leaf command, or an explicit
Nx target may own graph behavior, but the same command is never implemented by
both. See [[tasks#1. Positive Habitat And Nx Checks|task 1.6c3]].

Lint is the one intentional workspace-level exception to project-local command
ownership. Root `lint` routes directly to `habitat:lint`, and every project
check shares that one task through Nx. Biome owns ordinary source lint;
Habitat `structure.toml` and `pattern.md` packets remain the only structural
and source-relationship authorities.

The Runtime Realization lab follows the same ownership. Its former structural
target mixed topology, source relationships, phase bookkeeping, migration
history, evidence validation, and target self-inspection in one TypeScript
walker. The durable container axes now live in one closed Habitat topology
rule, and parser-visible plane relationships live in one Grit rule. Historical
inventories and self-checking orchestration are deleted rather than recast as
architecture. TypeBox-backed manifest validation remains in the report
boundary because entry identity, pinned evidence, fixture coverage, and the
behavior targets scheduled by the owner gate are executable evidence
semantics, not repository topology.

### One oRPC service owns curated lifecycle behavior

`services/agent-plugin-lifecycle` remains one service with bounded modules. Its
root composes contracts, ready host capabilities, implementation, and routers.
Each module owns its contract, operation routers, and owner-local
`model/{dto,entities,errors,policy,ports}` categories, with TypeBox schemas
colocated with their DTO or entity authorities. Each present category has one
`index.ts` import face plus direct semantic leaves. There is no service-wide
`model/index.ts`, and `helpers`, `actors`, and `prompts` are not model
categories. A service `db` child is admitted only through the separately
selected database blueprint after exact nested-member resolution closes that
relation; concrete acquisition and mechanics live in resources and providers.
The root model retains only ready host contracts,
dependency-owned observations, and the minimum service-owned domain model
consumed by multiple modules. Current-main selection is shared because
governance and providers consume the same service-owned policy; governance-only
operation requests and results remain module-owned. Domain behavior lives in
operation handlers and module policy, not an `internal/` implementation tree.

TypeBox schemas are the sole structural and generated-type authority for
requests, results, persisted JSON, and intermodule domain collaborations.
Opaque runtime capabilities may remain TypeScript-only. Operation handlers
canonicalize ordering, compute digests, and enforce cross-field domain rules
after structural validation. They do not manually recreate closed-object
parsing.

Root context is seeded once through the complete `deps`, `scope`, and `config`
construction lanes plus the per-call `invocation` lane. The base exposes a
separate complete context-seeded native middleware factory only for qualified
acquisition, guards, or enrichment; execution capabilities contributed there
enter through `provided`. Every module branch ends with one terminal curation
that selects the smallest route-facing vocabulary from direct descendants of
those inherited lanes. Router handlers author against the curated names rather
than reopening raw lanes. Native oRPC context merging remains additive, so the
curation is an authorship boundary and no `.use<Context>` claim, shadow context
type, adapter, or witness pretends inherited context disappeared. Projection-only
module middleware is not another capability owner. Leaf modules do not import
sibling internals or concrete resource providers.
Effect/Platform filesystem
and process programs terminate inside resource adapters and expose ready
capabilities. This is the generic Magic Migration service shape, not a
lifecycle-specific exception or a reason to move provider mechanics into
handlers.

The surviving filesystem/process resource family and lifecycle service migrate
coherently to Effect 4 only after controller authority, persistent
artifact/projection state, target records, and other rejected owners are
deleted. The atomic runtime boundary pins exact `effect`,
`@effect/platform-node`, the complete `@orpc/*` family, official
`@orpc/experimental-effect`, TypeBox, and Standard Schema versions together.
Community `effect-orpc`, oRPC 1 compatibility builders, and the old OpenAPI and
telemetry packages leave in the same checkpoint. Native oRPC owns contract,
implementer, middleware, and context construction; the official Effect bridge
adapts only Effect-backed handlers; one product-free TypeBox adapter owns
Standard Schema validation and Standard JSON Schema projection. Migrate any
active root-owned tool that consumes the root versions in the same checkpoint
so the workspace has no hidden older consumer. The boundary must leave one
Effect realm and one oRPC realm. TypeBox remains the public schema authority.

The oRPC 2 boundary also adopts the vendor's native placement of two semantics
instead of rebuilding the oRPC 1 representation. HTTP response status is
transport policy; local and serialized `ORPCError` values contain `defined`,
`inferable`, code, message, and data without a copied status property. Service
metadata is authored and read through typed native `defineMeta` plugins.
Services may narrow the metadata type with their own plugin/accessor pair, but
the namespaced raw `~orpc.meta` object is vendor storage rather than a public
domain contract. Linked-client and OpenAPI proof exercises those native shapes
directly.

The bounded agent-plugin lifecycle operations are:

- `status`: inspect selected membership and explicit native state without
  mutation;
- `sync`: reconcile one selected complete set into explicit Codex and Claude
  homes through native commands.

`test` remains a release-maintainer and CI capability for targeted or complete
verification in explicit disposable homes. It returns bounded inline target
observations and persists no receipt, identity sidecar, or custom evidence
artifact. Repository check, release-input generation, packaging, and vendor
update remain only when their owner-local consumer is confirmed. No adjacent
operation authorizes channel selection or installed state.

[[service-domain-frame]] fixes the exact five-module/twelve-operation capability
set, state owners, shared current-main and release-derivation collaborations,
request/context flow, failure boundaries, and idempotence guarantees that the
source correction must preserve.

### Native providers own mutation mechanics

The lifecycle service computes the exact desired delta. Thin resource providers
invoke native Codex and Claude commands and return bounded observations. RAWR
does not write provider caches or configuration directly and does not infer
provider homes by scanning.

The desired set is closed. RAWR-managed omitted members are removed, including
native enablement/configuration residue. Unmanaged or ambiguous collisions
block. A stale same-ID selected member performs the native remove/add transition
needed for active provider visibility. Partial failure returns the exact applied
prefix; retry starts from a fresh native inspection rather than rollback state.

A converged repeat may inspect live state but invokes no mutating native command
and writes no lifecycle-owned state.

### Derived artifacts do not become competing authority

The stable wire between reviewed Personal content and provider reconciliation is
the exact repository identity, commit, tree, and release-input digest in the
reviewed channel record. The content-workspace resource reads immutable Git
objects at that selection. The service derives the closed release model,
ownership index, native marketplace source, and declared provider-visible files
in memory. Release-set digests may be computed as invocation-local verification
values, but they are not recorded by Personal and never become local storage
handles. No provider projection identity is created.

The persisted release input declares members, ownership, provenance, locks, and
quality policy. It does not enumerate selected files or persist payload
manifests, payload digests, skill inventory, or completeness. Each invocation
enumerates every regular file below each declared member root from the exact
selected Git objects and derives those values in memory. A payload-only change
therefore changes the selected tree and applicable derived identities without
rewriting the release-input bytes or digest.

Status does not materialize provider package bytes. Sync first compares derived
identity with live provider provenance. Canonical mutation passes the selected
immutable Personal Git marketplace to the provider's native command, and the
provider owns its snapshot below the explicit home. A local marketplace is
test-only and converges at one reserved child of the caller-owned disposable
root. Each live test call has exclusive use of that root; sequential calls may
reuse it after the preceding call settles, while concurrent calls require
distinct roots. The child remains valid until the caller removes the root. No
Template-owned persistent release/set store, projection store, publication
index, or retention planner participates in the next invocation.

Generated manifests, ordinary command results, and caches may exist when they
have a concrete product consumer. Their classification is explicit:

- a release-set digest is an invocation-local derived verification value, not
  channel authority;
- a native-provider snapshot is provider-owned installed support state;
- a disposable local marketplace is derived test material owned by the
  caller's explicit disposable root; its stable child is not channel,
  repository, or provider authority;
- a test result retained by the caller or ordinary CI/release tooling is
  external evidence, never lifecycle state;
- a publication index or cache is recomputable mechanics;
- only the Personal channel record selects desired content;
- only native provider observation reports installed provider state.

No derived object silently becomes a prerequisite for a later canonical sync.
Controller digests, target receipts, and CLI-install identity are absent from
channel authority. Test observations are returned inline; the lifecycle owns no
test record, attestation, or evidence store.

### Repositories remain independent

Template owns executable code and generic tooling. Personal owns curated
content and its governed content records. Template reads Personal through an
explicit content workspace and versioned record schemas. It does not share Git
ancestry, executable paths, worktree identity, or release tooling with Personal.

Git checkouts are versioned-content and inspection inputs, never controller or
provider identities and never repository or symlink synchronization channels.
Personal source skills reject repository-local `.repos` prerequisites and
symlinks. Current Inngest guidance provides an explicit caller-owned cache-root
source oracle; oRPC, effect-oRPC, and Effect accept exact caller-owned source
roots only when a claim requires implementation inspection. Governed
vendor-content sync copies only the redistributed skill bytes into reviewed
Personal content; it does not synchronize repositories, checkouts, or links.

Task 6.4 must replace Personal's current controller/Civ7 checks with
repository-owned content validation and installed `@habitat-ai/cli@0.4.2`.
Until that lands, the predecessor checks are not accepted authority. Template
runs the private `rawr` lifecycle application against explicit Personal Git
records during cross-repository acceptance; Personal does not install that
private application, pin a controller selector, or vendor Template
implementation. Once useful Personal-only content and records are preserved,
remaining Template-derived code and process machinery are deleted from
Personal rather than synchronized.

### Accepted subject content uses the normal release path

The Inngest subject lane reached `accepted-landed-read-only` at historical
Personal review input `1e7f346b9b0fb7b356675d3e837295256bda7d0d`; current
canonical Personal `main` is `7c25bb4b09b3400f6c76913dccfa181171824fed`.
The accepted Inngest and Effect-Inngest skills live inside the legitimate
Personal `dev` member and MUST enter the selected canonical tree and release
input through that member's normal closed-world path. `inngest-orpc` and the
declared research/tool candidate roots remain excluded. No separate member,
materialization operation, package, projection, provider test, release, or
settlement exception is introduced. Template does not add an Inngest lifecycle
mode.

The removed custom controller's Inngest filter is not transplanted. The
private application dependency graph MUST truthfully exclude server, workflow, and
Inngest runtime packages. If shared `@habitat-ai/rawr-hq-sdk` dependency
metadata changes, the legitimate `apps/server` Inngest runtime receives its own
typecheck and behavior tests.

The queued oRPC corrective skill release remains downstream of this
normalization and the first `cognition:state-machine-design` settlement. It does
not widen this change.

## Deletion Order

1. Land the corrected record and positive Habitat/Nx architecture checks.
2. Restore ordinary Oclif development execution and direct external extension
   management.
3. Inventory the private application's current Nx dependency closure without
   making it or rejected predecessor projects publishable.
4. Delete the custom distribution, selector, embedded extension manager,
   controller identity, diagnostics, and their tests/workflows in bounded green
   nodes.
5. Delete persistent lifecycle stores and simplify the lifecycle service and
   surviving resources behind stable public behavior.
6. Migrate the complete surviving filesystem/process resource family and CLI
   adapter to one aligned Effect 4 family.
7. Recompute the surviving private application closure, then build and
   smoke-test it through its exact Nx-owned targets.
8. Recut Personal content records and required checks around explicit Git data
   interfaces and the supported Habitat packages.
9. Run disposable-home and approved-home convergence, then the read-only repeat.
10. Archive superseded records and drain owned stacks/worktrees.

Direct source and built Oclif execution provide the working development
replacement before operational deletion. The known installed controller,
retained releases, and global alias are then removed completely. No
compatibility layer connects the two models and no general cleanup authority is
introduced.

## Rejected Alternatives

- **Simplify the custom controller:** rejected because the ownership model is
  wrong, not merely too large.
- **Bundle the whole Oclif closure into a new Bun binary immediately:** rejected
  until direct Oclif plugin discovery and extension mechanics are proven.
- **Use Oclif standalone Node archives immediately:** rejected until Bun-only
  first-party command dependencies are removed or isolated.
- **Restore the old mixed agent sync service:** rejected because its command
  ownership and direct provider writes were wrong; only useful behavior and
  tests may be mined.
- **Delete ordinary CI evidence or provider manifests with the lifecycle
  stores:** rejected. Standard-tool output remains with its real consumer, while
  the lifecycle-owned release, projection, receipt, and evidence stores are
  deleted.
- **Make Personal equivalent to Template:** rejected; repository independence is
  a product boundary.

## Related

- Controlling frame: [[authority-amendment]].
- Service domain frame: [[service-domain-frame]].
- Change proposal: [[proposal]].
- Execution sequence: [[tasks]].
- Live record: [[README]].
