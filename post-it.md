# Working Frame Ledger

This is a prepend-only mental-model ledger, not architecture authority, a
backlog, or a second specification. Exact topology and source relationships
belong to [[.habitat/AUTHORITY|Habitat authority]] and its blueprint packets.
Durable lifecycle decisions belong to
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the active OpenSpec]].

## 2026-07-31 - Nx Receives Workspace-Bound Resolution

Native Nx plugin configuration is serialized data, not a dependency-injection
surface. The source projection therefore exports a plugin factory whose
runtime seams are an app-owned `clientForWorkspace(workspaceRoot)` capability
and the app's selected runtime cache inputs.
The later Habitat app invokes that factory inside the Nx plugin worker; it
constructs providers and fixes service scope from Nx's actual workspace root.
No client, callback, provider, or runtime handle crosses `nx.json`.

The plugin calls catalog resolution once per graph construction, then converts
the resolved applications into scheduler facts. Each application becomes one
cacheable leaf target with complete catalog authority and app-runtime inputs
plus scoped runner and subject inputs. One owner
aggregate is a dependency-only `nx:noop` target. Rejection fails graph
construction; the projection never invents a project, discovers authority,
checks an application, starts another Nx scheduler, or retains a catalog.
Global path existence, kind, and confinement remain graph-admission facts; they
are not repeated as task-cache inputs.

### Bag Of Keywords

application, projection, target, input, cache.

speed, parity, reuse, clarity, closure.

Nx, service, graph, selector, scheduler.

## 2026-07-31 - Projection Receives Ready Capability

Each completed Habitat command or Nx plugin projects one sealed service. It
receives a ready client from the app and translates only its native surface:
argv into a service request or resolved applications into Nx targets. They do
not select providers, construct resources, or reinterpret service outcomes.

The app is the single composition boundary. It chooses Node providers, binds
the repository scope, constructs the client, and supplies that client through
the native host mechanism. Oclif carries it on the invocation's Config options;
the Nx plugin factory will receive it when that projection exists. Neither path
earns a registry, daemon, loader, or retained runtime identity.

### Bag Of Keywords

service, projection, composition, entrypoint, artifact.

identity, parity, reuse, clarity, closure.

Oclif, Nx, Effect, TypeBox, app.

## 2026-07-31 - Source Is Observed, Structure Is Interpreted

Native structure evaluation is not an external evaluator merely because Grit
evaluation is one. A generic source-inventory resource acquires the current
Git-visible paths and tracked non-file facts through one host-selected
provider. Habitat service policy combines those facts with lazy Effect
filesystem observation and owns the meaning of a structure scope: root
matching, kind expectations, required and admitted children, closure, and
diagnostic classification. The procedure handler composes acquisition with
that pure policy inside one request.

This split preserves the product funnel. The resource knows nothing about
blueprints, applications, lanes, or structure semantics. The service does not
run Git or construct a provider. Ignored build and dependency output never
enters the admitted source inventory, while untracked nonignored content
remains visible. Git supplies ordinary workspace observation, not hostile
configuration hardening, lifecycle authority, or persistent state.

The rejected live-filesystem structure provider was a useful falsifier. It
would have treated ignored `dist` and `node_modules` directories as governed
source, moved domain policy into a provider, and widened the Grit result
contract before its consumer could admit path-only findings. None of that
landed. Source inventory and service-owned matching now proceed as separate
green checkpoints.

### Bag Of Keywords

inventory, path, kind, structure, finding.

source, truth, closure, parity, clarity.

observe, normalize, match, classify, report.

## 2026-07-31 - Evaluation Is A Service Decision

Catalog resolution and rule checking are two operations over the same admitted
Habitat authority. They remain inside one sealed catalog module so application
meaning does not rise into a service-root orchestration plane. One grouped
router leaf owns their shared current-repository observation; each procedure
still owns its operation sequence and pure module policy owns selection and
interpretation.

The host supplies one ready provider-neutral evaluator. The service never
selects Grit, constructs a runtime, or gives the resource catalog semantics.
It resolves applications, intersects selectors, reads the admitted program,
passes absolute subjects to the resource, validates returned paths, and derives
the Habitat result. The resource reports mechanics; the service decides
meaning.

The first executable set is deliberately closed to Grit `check` applications.
Native structure and `apply-dry-run` are refused before evaluation. Silence or
skipping would counterfeit a passing result; another mechanical capability
must land before those application kinds become executable.

### Bag Of Keywords

check, selector, application, finding, result.

truth, closure, determinism, diagnosis, idempotence.

resolve, select, evaluate, interpret, sort.

## 2026-07-30 - Evaluator Reports, Service Decides

Habitat realizes itself through the same product chain it governs. Rules remain
data. A provider-neutral resource describes mechanical evaluation, a provider
implements it, the Habitat service owns catalog admission and outcome meaning,
plugins project that service into Oclif and Nx, and the Habitat app selects the
providers and executable composition. No source package or release artifact
inherits the authority of all those parts merely by containing their output.

The first service boundary is catalog resolution alone. The service enumerates
the finite repository authority surface, recognizes exact blueprint and
instance locations, admits TypeBox-backed documents, resolves applications,
and refuses duplicate identities. The Effect filesystem and path capabilities
enter ready through service context. Mechanical rule evaluation joins only
when the later check operation consumes it.

Self-hosting does not let a candidate authorize itself. The currently installed
release checks candidate source until an ordinary Habitat app release replaces
it. Candidate self-checks are compatibility evidence. Version-three manifests
therefore activate only after a released checker can admit them; that bounded
bootstrap is not a permanent exception to Habitat structure.

### Bag Of Keywords

Habitat, catalog, admission, application, service.

authority, closure, parity, reuse, bootstrap.

TypeBox, Effect, oRPC, resource, Oclif, Nx.

## 2026-07-30 - Product Shape Governs Release

Habitat is a product suite, not a package with unusually broad privileges.
Its source follows the same narrowing realization chain it governs:
provider-neutral resources declare capabilities, providers implement them,
services own semantic truth, plugins project operations, an app selects the
product graph, runtime realizes it, and an entrypoint activates it.

`@habitat/cli` remains one ordinary Oclif release identity. That distribution
boundary may assemble several source projects without making the release
package their semantic owner. Packages retain only product-free support
matter; a package may not absorb a service, provider selection, projections,
or app composition merely because one artifact ships them together.

Habitat governs its own source through the ordinary blueprint kinds. There is
no composite `habitat-cli` exception. The repository itself is the Habitat
product suite; RAWR is one governed product realization inside it. A second
repository would add coordination without clarifying authority, so the
existing repository keeps its history and becomes the renamed Habitat
identity after the active stack is clean and drained.

The active source intake is therefore migration evidence until it is recut
into the canonical product graph. The recut also closes three concrete
behavior gaps: blueprint discovery is limited to the blueprint authority
root, owner selection includes resolved applications, and blueprint-only
execution never depends on the predecessor registry.

### Bag Of Keywords

Habitat, product, service, plugin, app.

identity, coherence, closure, clarity, reuse.

blueprint, resource, provider, Oclif, Nx.

## 2026-07-30 - Mechanics Ship Once

Habitat is one Template-owned product with two deliberately separate outputs:
an executable evaluator and a data-only policy pack. Template owns the source,
package identity, release, and integration contract for both. Consumers own
their instances, repository policy, hook files, and final scheduling choices.
That line makes reuse ordinary rather than negotiated.

One resolved application is the unit of execution. Blueprint law plus
repository instance becomes an application; the CLI and Nx plugin consume the
same deterministic catalog. Nx owns scheduling and caching. Habitat owns
resolution and evaluation. Grit owns source relations. No consumer reproduces
those wires, and no compatibility registry becomes a second runtime path.

The source checkpoint proves ownership before distribution. The initializer is
the next independent product boundary: it must integrate Nx, Grit acquisition,
and one named hook contribution without erasing consumer policy. Publication
follows only after that behavior is sealed. This keeps source, setup, policy,
and release reviewable without turning them into separate authorities.

### Bag Of Keywords

tooling, catalog, blueprint, package, release.

authority, reuse, closure, clarity, leverage.

Nx, Habitat, TypeBox, Grit, Graphite.

## 2026-07-30 - Habitat Integrates Once

RAWR HQ-Template owns Habitat source, package identity, releases, generic
policy distribution, and consumer integration. Magic Migration and Civ7 are
high-value design and implementation evidence with historical provenance, not
current package authority. The accepted source lands here, is reviewed here,
and is released from here.

Consumers select an exact package, policy packs, and repository instances.
They do not reproduce Nx plugin registration, repository targets, hook
composition, Grit acquisition, or source trees. One idempotent initializer
owns that ordinary integration so every downstream repository receives the
same mechanics without surrendering its own policy and instance authority.

The repository still owns its hooks. Habitat supplies one named contribution,
preserves unrelated behavior, upgrades only its own contribution, refuses a
conflicting Habitat contribution, and removes nothing without an explicit
removal operation.

The executable CLI and the data-only blueprint pack remain separate public
artifacts because mechanics and policy have different owners inside the
product boundary. That separation does not justify two installation paths:
the initializer binds both through one exact protocol.

Source intake is scoped extraction, not ancestry or wholesale copying. Product
policy stays with its current product owner. Ownership is already assigned;
combined intake/deproductization, vendors, initialization, policy, and release
are distinct checkpoints.

### Bag Of Keywords

Habitat, source, package, release, policy, initializer, consumer, plugin,
generator, pin, protocol, instance.

## 2026-07-30 - Persistence Requires A Truthful Owner

A service database owns physical persistence for the whole standalone service,
even when one module is its only current consumer. Modules do not acquire a
database, apply migrations, or import store implementations. The host selects
and prepares the database resource, service-root middleware projects a narrow
store capability, and `module.ts` curates that capability for operation
handlers. This preserves one downward context funnel without turning the
service root into a second domain-logic plane.

Journal JSON records remain canonical operational history. SQLite is a derived
index for tail and search. The SQL migration therefore owns the physical index
shape, while the CLI host owns connection preparation and applies the packaged
migration before returning a ready handle. One migration needs no migration
framework: no registry, scanner, version table, runner, or generic publication
mechanism is earned.

Operation handlers retain the behavioral decisions. A snippet write records
canonical JSON before its best-effort index update; canonical reads use JSON;
tail and search use the ready derived index. The store owns physical mapping
and database mechanics, not request policy, semantic fallback, or public
results.

Journal entity schemas remain at the existing module-root authority in this
checkpoint. Moving them under `model/entities` waits for the shared TypeBox and
platform-neutral entity laws; database closure does not silently activate that
separate source authority.

### Bag Of Keywords

truth, record, index, cache, migration, host, store, context, module, service,
owner, ready.

## 2026-07-30 - Curation Governs Authorship

Native oRPC beta.20 middleware context is additive: a module projection adds
curated names but does not erase the initial service context at runtime or from
the inferred handler type. Module curation therefore defines the intended
operation vocabulary, not a capability sandbox. Handlers author against that
vocabulary; the staged Habitat source law is the enforcement owner for
preventing them from reopening the root construction lanes when that
service-wide law activates.

That distinction keeps the service funnel honest. `base.ts` admits complete
host dependencies, each `module.ts` selects the names its operations need, and
router handlers consume those names. We do not add a context wrapper or a
second implementation boundary merely to simulate erasure that oRPC does not
provide. True runtime isolation would require a separate initial-context or
router boundary and is not earned by this request-bounded service.

### Bag Of Keywords

context, merge, curation, authorship, source, boundary, handler, capability,
law, honesty.

## 2026-07-30 - Product Bounds Handoff

A downstream consumer can reveal a missing production boundary, but it cannot
make peer-specific infrastructure part of the product by needing it. The test
is independent utility: the upstream checkpoint must simplify a real host,
replace concrete provider construction with one qualified runtime boundary,
and preserve only lifetimes that actual acquired handles create. If the
requested abstraction exists solely to unlock a moving research branch, it is
not an upstream capability.

The handoff is one reviewed canonical-main commit, never a branch name or
partially composed stack. It contains the complete reusable boundary and its
behavior proof; the downstream lane consumes it without forking the TypeBox,
oRPC, Effect, resource, or provider model. Until that exact commit exists,
design context is not implementation authority.

### Bag Of Keywords

product, consumer, boundary, host, provider, handle, lifetime, proof, commit,
handoff, reuse, refuse.

## 2026-07-30 - Service Narrows Capability

A service is one request-bounded capability suite. Its root declares the
context, contract, and genuinely shared domain model that every contained
branch descends from; it is not an orchestration plane over its modules.
Modules own sealed subdomains, curate their exact context in `module.ts`, and
author decisions and effects inside named oRPC procedure handlers. Their
`router.ts` files compose completed `router/*.router.ts` leaves, and the service
router composes completed module routers. Context and implementation move
downward; completed operation trees move upward.

The ownership test stays semantic. A reusable runtime capability with an
acquisition lifecycle is a resource implemented by providers. A separately
owned domain capability is a sibling service. Cross-service or durable
orchestration belongs to a plugin or workflow. App code selects and realizes
providers. None of those classifications is justified merely by a large
context, shared TypeBox value, or convenient extraction. The lifecycle service
remains one service while its modules change one coordinated release truth
inside one request; provider destinations remain truthful external owners
behind ready resources.

Habitat now admits only that narrowing shape. Positive closed topology removes
alternative destinations such as `common`, `shared`, `internal`, detached
handlers, and service-root dependency catalogs. Source law guards the few
directional edges structure alone cannot express. It does not micromanage
ordinary collaboration inside a sealed module or build an alias-obfuscation
detector. TypeBox owns structural data contracts, oRPC owns context and
procedure composition, Effect owns execution and lifetime, and behavior tests
own outcomes.

### Bag Of Keywords

service, request, capability, context, contract, model, module, router,
handler, resource, provider, plugin, app, descend, compose, curate, own,
close.

## 2026-07-30 - Graph Owns Selection

The released Habitat package is a tool dependency, not repository authority.
Its version and integrity identify the evaluator; `.habitat/**` identifies the
laws. The Nx plugin projects that registry into cacheable rule targets and
owner-local policy targets, so neither a root script nor a hook needs another
rule inventory.

An active blueprint is an affirmed law and is therefore enforced. A law whose
live corpus is not yet green belongs in the explicit staged area with a
candidate manifest, outside the required registry. Its burn-down branch first
activates the law, then makes that red corpus green before landing. Hooks
select from the same registry and package rather than creating another
admission path.

The next peer handoff follows the same shape: only one reviewed, landed runtime
checkpoint can become a restack base. A moving branch or partial service
checkpoint is context, never identity.

### Bag Of Keywords

package, registry, rule, owner, graph, cache, hook, stage, enforce, handoff.

## 2026-07-30 - Lifetime Follows Handles

Provider selection and resource lifetime are separate questions. The CLI app
owns one cold profile of exact factory references. After command input is
admitted, it materializes ready dependencies once, constructs one local service
client with fixed `deps`, `scope`, and `config`, and invokes one selected
operation with fresh invocation context.

Only an acquired handle creates a release obligation. This dependency graph
contains cold resource objects; its actual handles, temporary directories,
capture claims, child processes, and publication files are acquired and cleaned
up inside their owning operations. A process runtime, global client, registry,
cache, or no-op finalizer would invent lifetime rather than manage it.

The downstream handoff is therefore exact but narrow: Template provides
app-owned selection, compiler-visible provider closure, direct service binding,
and preserved operation-local cleanup. It does not claim process-owned
acquisition or release where no such lifetime exists.

### Bag Of Keywords

profile, factory, client, handle, lifetime, command, operation, cleanup,
selection, binding, owner, closure.

## 2026-07-30 - Cohesion Follows Shared Truth

A service boundary follows the invariant that changes together, not the number
of modules, dependencies, or external destinations inside it. Releases,
governance, packaging, providers, and vendors consume coordinated subsets of
one admitted release domain: selected Git identity, release input, ownership,
payload, release set, and current-main selection. Their different writes are
performed through ready resources whose destinations remain truthful state
owners. Those destinations do not become peer service identities merely
because their mechanics and lifetimes differ.

The root context therefore declares the service's complete ready capability
set once. Each module then curates the smallest vocabulary its handlers need.
The host, not the service, selects providers, acquires resources, binds the
service, and releases the process lifetime. Eagerly constructing every concrete
resource for each CLI operation is a host-realization defect, not evidence that
the domain must be split.

A branch's placement must be reopened only when it owns an independent semantic
model and change cadence, serves a consumer without the shared release truth,
or requires durable sequencing outside one request. The answer may be a
sibling service, plugin, or workflow. Until then, splitting would put service
calls across the strongest collaboration and obscure the invariant it is meant
to clarify.

### Bag Of Keywords

service, release, module, context, policy, resource, provider, request, owner,
cohesion, runtime, binding.

## 2026-07-29 - Schema Owns Shape

TypeBox is the sole authority for object membership, required fields, primitive
shape, and derived TypeScript types. Policy begins after structural admission.
It may bound work, canonicalize values, preserve deterministic issue ordering,
and enforce relationships that a field schema cannot express, but it does not
restate the schema through handwritten key lists or exact-record parsers.

The service root owns only values that genuinely cross module boundaries.
Release derivation and content-workspace snapshots qualify because Releases,
Packaging, and Providers exchange them. Their schemas therefore live with the
service model and their types descend from those schemas. Module-specific
results remain inside their modules. The correction is deletion-first: reuse
the native TypeBox validator, project only truthful diagnostics, and add no
generic parsing layer or service-wide schema walker.

### Bag Of Keywords

schema, shape, type, admission, issue, bound, policy, identity, module,
service, deletion, proof.

## 2026-07-29 - One Router Face

A service narrows from host context into one configured service, then into one
module branch, then into authored operations. The file shape should make that
descent obvious without explanation. A named `router/*.router.ts` leaf is where
an operation consumes curated context and performs its transition. The
module-root `router.ts` only composes completed values. A `router/index.ts`
would create a second reachable face and restore ambiguity about where
authorship belongs.

Habitat closes this shape before production moves. Contract and optional
middleware catalogs retain their own indexed roles because they are different
kinds: declarative composition and qualified middleware access. The router is
executable authorship, so its leaf and composition destinations remain visibly
separate. oRPC owns the boundary and context descent; Effect owns execution;
TypeScript owns inference; Habitat owns the possible shape.

### Bag Of Keywords

service, context, module, router, leaf, handler, contract, middleware,
composition, authorship, descent, closure.

## 2026-07-29 - Git Closes Content

The release input declares desired content, not a second copy of content
identity. It closes plugin membership, ownership, provenance, locks, and
quality policy. The reviewed Git commit and tree close the selected bytes.
During one invocation, the lifecycle service derives file inventory, modes,
payload digests, and release identity from those exact Git objects, then
discards the derived working values. One ordered plugin-ID/release-digest list
witnesses complete-set membership; a second completeness record would only
duplicate the same derivation.

This split keeps each fact with its truthful owner. Personal Git owns curated
content and its declarations. Template owns derivation and reconciliation.
Native providers own installed state. A persisted per-file release-input
manifest duplicates Git, makes content authoring needlessly heavy, and creates
another representation that can disagree. Because the first ordinary CLI
release is not yet published, the obsolete shape is deleted in place without a
version bridge, fallback, or compatibility reader.

See
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/authority-amendment|the authority amendment]],
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/tasks#6. Personal Content-Only Settlement|the settlement tasks]],
and
[[services/agent-plugin-lifecycle/src/service/model/dto/release-input|the release-input model]].

### Bag Of Keywords

Git, input, member, owner, provenance, policy, derive, payload, release,
provider, closure, deletion.

## 2026-07-29 - Policy Is Not A Phase Script

Repository law has one qualified owner. Habitat declares closed topology in
`structure.toml` and parser-visible source relationships in `pattern.md`. Nx
schedules those checks and owns project dependency edges. Tests prove behavior.
Scripts perform bounded operations. A script that walks source to decide where
files may live or what they may import is not a transitional convenience; it
is policy in the wrong container.

The correction is deletion-first. Stable positive constraints move into the
owning Habitat blueprint or niche. Historical names, migration inventories,
self-checking target lists, and phase bookkeeping disappear rather than
becoming permanent law. Template currently admits no script-backed Habitat
rule. A future native capability gap must first receive a named authority
decision and retirement boundary before packet topology changes.

### Bag Of Keywords

Habitat, law, structure, source, graph, behavior, script, operation, closure,
deletion.

## 2026-07-28 - Reveal The Native Wires

The service shape is sealed. The next reduction removes compatibility material
that still hides the ordinary product flow. Oclif owns application composition,
installation, release, and external extensions. The lifecycle service owns the
qualified curated-content decisions behind `rawr agent plugins`. Personal owns
the content. Native providers own installed state. Template needs no copied
content, custom distribution identity, or legacy sync interpretation between
those owners.

Each checkpoint now deletes one obsolete reader and writer together, proves the
surviving native boundary, and lands before another concern opens. Historical
evidence remains historical; active guidance names only the surviving owners.

### Bag Of Keywords

Oclif, lifecycle, content, provider, owner, command, package, deletion,
closure, settlement.

## 2026-07-28 - Ratchet The Known Service

The service kind is already settled in Magic's Jobs and Candidates services.
Template adopts that one positive shape rather than cataloging alternate source
programs. Habitat closes the service and module containers. oRPC owns context
descent, middleware, procedures, routers, and clients. Effect owns execution,
failure, interruption, and resource safety. TypeScript owns inference and
router completeness. Nx owns project edges. Behavior tests own outcomes and
ordering. A module may collaborate freely inside its sealed interior; crossing
the module root is the categorical boundary.

### Bag Of Keywords

service, capability, context, module, contract, middleware, router, operation,
model, resource, provider, plugin, app, descent, ownership, closure.

## 2026-07-28 - Capability Depth Owns Policy

A service is a narrowing capability funnel, not a web of convenient imports.
The base declares context and authors native context middleware only when such
middleware exists. The implementation binds the aggregate contract once and
attaches direct service-root middleware leaves. Modules descend from their
exact configured branch. Module-wide policy attaches at the module, deliberate
group policy at the matching router group, and exact policy at the operation.
Module and group distribution stays independent of validated input; named
validated-input policy remains attached at every consuming procedure after its
schema. Handlers remain the authorship site for decisions and transitions.

The file shape follows those semantic depths. Root middleware has direct leaves
and no barrel. Module contract, middleware, and router directories use one
indexed access face over semantic leaves. That closure does not replace
judgment: awkward service composition still triggers the ownership test for a
hidden resource, sibling service, plugin, or app concern. The structure merely
makes the answer visible and keeps an invalid destination unavailable.

See [[.habitat/blueprints/service/skill|the service capability frame]],
[[.habitat/AUTHORITY#Service Source Law|the source-law summary]], and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/tasks#5. Bounded Agent-Plugin Lifecycle Service|the active burn-down]].

### Bag Of Keywords

service, funnel, context, depth, policy, module, group, operation, handler,
resource, plugin, app, closure.

## 2026-07-28 - Native Semantics Stay At Their Boundary

A vendor-major boundary is an opportunity to delete representation debt, not
an excuse to rebuild the predecessor inside a facade. In oRPC 2, HTTP response
status belongs to transport while local and linked error values carry
`defined`, `inferable`, code, message, and data. Keeping the same domain error
codes, payloads, messages, and HTTP outcomes does not require copying transport
status into local objects or wire bodies.

Procedure metadata follows the same rule. A service owns the meaning and the
typed vocabulary, while native `defineMeta` owns attachment, inheritance, and
storage. A service-local plugin and accessor can narrow that vocabulary without
claiming the raw namespaced `~orpc.meta` object as a public domain face. Tests
therefore prove semantic values through the typed accessor and transport
behavior through real linked clients.

See [[services/example-todo/src/service/model/policy/procedure-metadata|the typed service policy]],
[[apps/server/src/orpc|the HTTP boundary]], and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/design|the runtime decision]].

### Bag Of Keywords

native, error, status, transport, metadata, policy, accessor, storage,
boundary, deletion.

## 2026-07-28 - Cohesion Tests The Service Boundary

The practical "break your ankles" test is a service-cohesion falsifier. A
service should feel like one domain capability suite whose ready resources
descend through one context funnel and whose modules own coherent subdomains.
Awkward acquisition, branching, or assembly is evidence that the service may
be hiding a repository-wide resource, a sibling domain service, plugin
exposure or orchestration, or app-owned runtime configuration.

The test does not reward fragmentation. Size alone proves nothing, and a
reusable helper is not automatically a resource. Reclassify only when the
candidate has its own lifecycle or repository-wide utility, owns a distinct
domain truth, exposes another capability, or realizes runtime configuration.
After those concerns move to their qualified owners, the service should retain
the domain decisions, transitions, and operation authorship that make it one
capability suite.

### Bag Of Keywords

service, cohesion, domain, resource, sibling, plugin, app, context, lifecycle,
owner, awkward, falsifier.

## 2026-07-28 - Native Clients Preserve The Lanes

Client construction is native oRPC ownership, not a shared SDK capability.
Each service fixes `deps`, `scope`, and `config` once and admits only
`invocation` from a call. The context resolver reconstructs the initial context
explicitly, copies invocation into a fresh carrier, and starts `provided`
empty. Middleware remains the only author of execution-provided capabilities.

Deleting the facade makes the important boundary visible: service-defined
lane meaning remains stable while native oRPC owns construction and dispatch.
No helper replaces the helper.

See [[services/example-todo/src/client|the worked native client]],
[[services/example-todo/test/todo-service.test|the lane isolation oracle]], and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README#Native Service Client Authority|the execution record]].

### Bag Of Keywords

native, client, context, lane, fixed, invocation, resolver, deletion, service,
boundary.

## 2026-07-28 - Vendor Preparation Preserves The Boundary

Version alignment is dependency preparation, not service migration. Every
direct Effect and Effect Platform declaration now selects one beta 101 realm;
every direct TypeBox declaration selects 1.3.8. The lifecycle service no longer
pretends to own `@orpc/shared` directly when only the oRPC packages consume it.
The lock remains the dependency closure, while native validation and resource
behavior remain the product proof.

The TypeBox adapter still reports native messages without inventing paths. The
current oRPC 1.14.8 family remains intact only until the separate oRPC 2 switch;
this checkpoint adds no wrapper, bridge, pointer model, or compatibility lane.
Historical version evidence stays attached to the checkpoint that produced it.

See [[package.json|the root vendor selection]],
[[packages/hq-sdk/src/orpc/schema|the TypeBox adapter]], and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README#Effect And TypeBox Vendor Preparation|the execution record]].

### Bag Of Keywords

vendor, realm, version, schema, effect, resource, closure, proof, deletion.

## 2026-07-28 - Structure Feedback Is Not Admission

One task name should express one scheduler purpose. `check:policy:local` is the
complete selected local Habitat policy leaf under repository admission.
`check:structure` is a smaller independent Habitat-structure leaf for Codex Stop
feedback. Stop does not become a second admission graph: it runs neither lint,
Grit, complete policy, nor project admission. Pre-push and protected CI retain
the complete Nx graph.

Both leaves call the pinned Habitat CLI directly and remain uncached. That is
an explicit interim boundary, not a new registry, runner, or cache model. A
future upstream distributable Habitat Nx integration may own discovery, exact
Nx cache inputs, caching, and one acquisition; the current rule scopes remain
exact. Task 5.7e22 remains open until that boundary actually exists for
Template.

See [[scripts/habitat/project.json|the Habitat Nx owner]],
[[.codex/hooks.json|the Codex hook composition]], and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README#Interim Habitat Structure Feedback Boundary|the execution record]].

### Bag Of Keywords

structure, policy, scheduler, owner, hook, graph, cache, boundary, proof,
closure.

## 2026-07-28 - Authority Precedes Migration

The service container is now fixed before another production file moves. A
service narrows ready host capabilities through base context, root policy, a
configured module branch, optional module policy, terminal curation, and an
operation handler. Contract and router directories ascend through one index
face; root files compose the suite. Habitat closes those relations while the
current source remains honestly red.

Domain structure follows meaning rather than transport convenience. An entity
has stable domain identity that survives attribute changes and participates in
domain transitions. Persistence may reveal that meaning, but persistence alone
does not create it. TypeBox owns the canonical entity schema and generated
type. DTOs are operation or boundary projections; database schemas describe
physical mappings; stores privately realize persistence and may map records
into entities when the domain models continuing identity. Entities never
import those transport, provider, or persistence interiors.
Cross-module identity or invariants belong at service root; access alone does
not promote module meaning. No database DTO mirror or compatibility face is
needed. The entity destination remains advisory until the shared TypeBox and
platform-neutral source laws cover it; production source does not move under a
partial authority.

The stronger public-consumer law is also advisory. Its shared relative-path
matcher currently mistakes owner-local `../../src/service` test imports for a
sibling-service reach. That matcher is corrected once in the common law before
enforcement; local production rewrites will not compensate for a false
classification.

See [[.habitat/blueprints/service/skill|the service frame]],
[[.habitat/blueprints/database/skill|the database frame]], and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README#Magic Service And Database Authority|the execution record]].

### Bag Of Keywords

identity, transition, invariant, projection, transport, persistence, mapping,
store, context, ownership.

## 2026-07-28 - Contracts Narrow Into Runtime

Example Todo's module contracts are native oRPC declarations, not projections
of the service runtime. Each procedure now begins at the runtime `oc` value
imported directly from `@orpc/contract` and carries its complete static metadata
through the service-owned `TodoProcedureMetadata` policy model. That inert type
extends the neutral SDK metadata base and is shared by the service declaration
and all six public procedure contracts. The contract plane no longer reaches
upward into `base.ts` for an `ocBase` facade; runtime construction instead
consumes the completed contract downstream.

This bounded move is proven through the contracts themselves, the public
metadata type oracle, and runtime behavior. It does not install a temporary
flat-contract source check. The immediately following Magic directory/oRPC2
authority checkpoint owns the durable contract source law.

See [[services/example-todo/src/service/modules/tasks/contract|the native task contract]],
[[services/example-todo/test/procedure-meta.test|the metadata oracle]], and
[[services/example-todo/test/context-typing|the public metadata type oracle]].

### Bag Of Keywords

contract, authority, native, module, context, runtime, detachment, metadata,
closure, locality.

## 2026-07-28 - Contract Roots Close Through Native Authority

A module router and a contract-first service root are different kinds of
composition. Module `router.ts` aggregates completed operation groups as a
plain object because it owns no additional contract boundary. The service root
must close those modules through its native implementer so oRPC attaches the
root contract relation used by runtime tooling. A TypeScript `satisfies` check
cannot substitute for that native behavior.

This correction preserves the funnel. Handler authorship remains in named
router leaves, module aggregation remains plain, and the service root performs
only native contract completion. It adds no policy, middleware, or alternate
context author.

For the pinned N1 lane, the configured owner is the `service` exported by
`impl.ts`, so root completion is `service.router(...)`. oRPC 2 examples that
name a different configured implementer do not supersede this lane's exact
runtime and source authority.

This entry supersedes the older API-module sentences that described the
service root as plain composition with only a type check. Module aggregation
stays plain; contract-first service-root completion does not.

See [[services/example-todo/src/service/router|the worked root]],
[[services/example-todo/src/service/impl|the implementer]], and
[[services/example-todo/test/procedure-meta.test|the runtime contract oracle]].

### Bag Of Keywords

contract, service, root, module, router, handler, completion, authority,
runtime, composition, flow.

## 2026-07-28 - Module Shells Separate Curation From Authorship

The service funnel narrows through distinct authoring sites. `module.ts`
inherits the service branch, attaches only qualified middleware, and curates
the smallest vocabulary its handlers may use. Named `router/*.router.ts`
leaves author operation behavior against that vocabulary. Module `router.ts`
then composes completed operation groups as a plain object; it does not reopen
the native builder or become another behavior site.

Empty middleware placeholders are not uniformity. They create false extension
points and hide the fact that a module has no additional concern. Real
middleware receives a qualified filename and observes or enriches inherited
context before terminal curation. The hierarchy is therefore closed by what
each layer owns, not padded until every directory looks alike.

See [[services/example-todo/AGENTS|the worked service]],
[[.habitat/blueprints/service/require_service_spine_topology/structure|the closed topology]],
and [[.habitat/blueprints/service/require_service_router_authorship/pattern|the authorship law]].

### Bag Of Keywords

service, context, module, curation, middleware, router, handler, composition,
closure, locality, flow.

## 2026-07-28 - API Modules Follow Contract Branches

A module is the owner of one service capability branch, not whichever nested
operation group happened to need more files. The embedded Todo module is
therefore `example-todo`, matching `service.exampleTodo`; `tasks` remains a
router group inside that module. This preserves one downward identity from
contract to implementer to module to handler.

Named router files author operations and intentional groups. `router.ts` at
the module boundary composes those completed groups as a plain object, and the
service `router.ts` composes completed modules the same way. Neither boundary
re-enters the native builder or authors behavior. The root retains the exact
contract relation as a type check rather than reconstructing execution.

See [[plugins/server/api/example-todo/src/service/modules/example-todo/AGENTS|the API module]],
[[.habitat/blueprints/service/require_service_orpc_composition/pattern|the composition law]],
and [[.habitat/blueprints/service/require_service_router_authorship/pattern|the authorship law]].

### Bag Of Keywords

contract, service, branch, module, router, group, handler, composition,
identity, boundary, flow.

## 2026-07-28 - Embedded API Context Is A Host Projection

An embedded API service receives one service-shaped projection from its host.
The host supplies ready dependencies under `deps`, stable request scope under
`scope`, externally selected behavior under `config`, per-request facts under
`invocation`, and an empty `provided` bucket. The API does not invent a second
request context or reconstruct those lanes inside a module.

`base.ts` owns one native context author. Named middleware derived from that
author may use a ready host resolver and request scope to contribute the
qualified client under `provided`. `module.ts` then curates only the client and
invocation facts its routers need. Handlers remain the operation-authoring
site and see the module vocabulary rather than the host context or raw lanes.

The resolver is already a host capability, so this flow needs no new resource,
provider registry, or embedded `createServiceProvider` authority. Habitat
admits only the base-owned native middleware author and keeps every alternate
authoring root closed.

See [[plugins/server/api/example-todo/AGENTS|the embedded API boundary]],
[[.habitat/blueprints/service/skill#Context|the service context frame]], and
[[.habitat/blueprints/service/require_service_context_boundaries/pattern|the executable law]].

### Bag Of Keywords

host, service, context, lane, resolver, middleware, client, module, curation,
handler, flow, boundary.

## 2026-07-27 - Modules Curate Route Context

Example Todo's flattened module projection is the reference pattern, not
migration residue. Service context flows downward into each `module.ts`, and
the module names the smallest capability vocabulary its routers need. That
curation keeps route authors inside their subdomain without creating another
lane, acquiring resources, or moving policy out of handlers and model.

Native oRPC composition remains additive: the inherited lanes still exist at
runtime. The design boundary is authorship. Routers author against the
module-curated names, while capability construction stays with qualified
middleware and outside mechanics stay with resources and providers. This
entry supersedes the contrary sentence in the earlier context-lane note.

See [[services/example-todo/AGENTS#Context Lanes|the worked context flow]],
[[.habitat/blueprints/service/skill#Context|the service frame]], and
[[.habitat/blueprints/service/require_service_context_boundaries/pattern|the executable law]].

### Bag Of Keywords

service, lane, context, curation, module, router, handler, provider, boundary,
flow.

## 2026-07-27 - Service Persistence Enters Once

Example Todo now demonstrates the full downward flow. The host supplies one
database pool through `deps`. Root middleware acquires one SQL capability for
the operation, binds the service scope, and contributes three workspace-bound
stores under `provided`. Each module curates only the store and inherited
values its routers need. Handlers retain validation, policy, sequencing, and
failure decisions.

The service-root database owns migrations and store implementations. The
service-root model owns store contracts because multiple modules and
persistence share them. Modules neither connect to the database nor construct
stores. Context curation is additive: the type fixture observes the curated
field and every inherited lane together after native oRPC composition.

See [[services/example-todo/AGENTS|the worked service]],
[[services/example-todo/src/service/middleware/stores.middleware|the root store middleware]],
and [[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README#Example Todo Service Database|the execution record]].

### Bag Of Keywords

service, database, store, migration, provider, context, curation, module,
handler, scope, owner, flow.

## 2026-07-27 - Module Context Curation Is Additive

Module projection is a real service-authoring boundary. A `module.ts` may end
its service branch with one inline curation that selects direct noncomputed
member paths rooted below `deps`, `scope`, `config`, `invocation`, or
`provided` and exposes them under explicit handler-facing names. This gives the
module a precise vocabulary without acquiring resources, constructing
dependencies, or restating the service context type.

Native oRPC context composition remains additive. The four input lanes and the
`provided` bucket are still present after curation, so a smaller returned
object is not evidence that they were removed. Actual removal belongs to the
capability's source and owner. Named middleware still owns guards and
enrichment. In standalone services, only named root middleware uses the sole
provider author specialized once in `base.ts`; embedded API provider authorship
is outside this law.

See [[.habitat/blueprints/service/skill#Context|the service context frame]] and
[[.habitat/blueprints/service/require_service_context_boundaries/pattern|the native context law]].

### Bag Of Keywords

service, context, curation, provider, author, middleware, owner, closure.

## 2026-07-27 - Database Shape Separates Logical And Physical Authority

A service database always owns migrations and stores. Migrations describe how
physical state evolves; stores implement service-owned persistence behavior.
TypeBox already owns the logical record schemas consumed by service contracts,
so another schema directory is not a ceremony every database must repeat.

Some database technologies still need distinct physical mappings. For those
technologies, the same closed database boundary may contain a closed `schema`
interior with only named `*.schema.ts` leaves. Making that interior optional
removes duplicate authority without opening the database or weakening its
service-root ownership.

See [[.habitat/blueprints/database/skill|the database frame]],
[[.habitat/blueprints/database/require_service_database_topology/structure.toml|the closed topology]],
[[.habitat/AUTHORITY|Habitat authority]], and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README#Schema-Optional Service Database|the checkpoint record]].

### Bag Of Keywords

database, migration, store, schema, TypeBox, logical, physical, evolution,
mapping, service, owner, closure.

## 2026-07-27 - Context Is Organized By Owner And Lifetime

Example Todo's context lanes are a retained service-design asset, not temporary
wiring. `Deps`, `Scope`, and `Config` bind once for a client. `Invocation`
arrives with each call. The SDK seeds an empty `provided` bucket and provider
middleware grows its capabilities for the remaining execution. Static metadata
is not context.

The funnel preserves these names while narrowing authorship. Modules inherit
context through their service branch; handlers consume the capabilities they
need. They do not import runtime assembly, redeclare the complete context, or
manually rebuild the lanes. The HQ SDK already realizes this model, so the
correct move is to preserve and document it rather than replace it.

Example Todo still flattens selected values during module projection. That is
retained migration evidence, not another lane and not a pattern to propagate.

See [[services/example-todo/AGENTS#Context Lanes|the worked service]],
[[.habitat/blueprints/service/skill#Context|the service frame]],
[[packages/hq-sdk/src/orpc/context/types|the reusable context model]], and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README#Example Todo Context Lanes|the checkpoint record]].

### Bag Of Keywords

context, owner, lifetime, deps, scope, config, invocation, provided, metadata,
host, binding, caller, middleware, module, handler, funnel.

## 2026-07-27 - Records Cross Boundaries Without Moving Behavior

The Todo service root owns the inert task, tag, and assignment record
vocabulary because those records cross module contracts and the service-owned
persistence boundary. This is not promotion for convenience. The schemas name
stable service facts that remain meaningful to more than one module and to the
database boundary that will store them.

Each module still owns its operations, policy, normalization, sequencing, and
declared failures. A root record schema does not authorize root logic or a
sibling reach. TypeBox remains the one structural authority; each generated
record type stays beside its schema, and modules import the exact service-model
leaf through the owner-private alias. The former loose module `schemas.ts`
files disappear without barrels or compatibility exports.

See [[services/example-todo/AGENTS|the Example Todo service router]],
[[services/example-todo/src/service/model/dto/task|the task record]],
[[services/example-todo/src/service/model/dto/tag|the tag record]],
[[services/example-todo/src/service/model/dto/assignment|the assignment record]],
and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README#Example Todo Record Model|the active checkpoint record]].

### Bag Of Keywords

record, schema, service, module, contract, database, owner, TypeBox, context,
boundary.

## 2026-07-27 - Service Root Owns Service-Wide Meaning

Example Todo's root model owns meaning that remains true for the whole
capability suite: todo identity, workspace scope, and the pure clock and
identifier-generator ports admitted at the service boundary. Multiple module
consumers are evidence to inspect, not ownership authority. Module entity
schemas reuse the service-wide DTOs, while each module contract owns its
caller-visible errors even when another contract declares the same error code.

Modules reach exact root-model leaves through the owner-private service alias.
Root-model leaves and the service base keep their direct relative edges. The
service context carries ready host capabilities downward; it does not turn a
port into construction mechanics or move operation transitions out of their
handlers. The unowned `service/common` aggregate and its internal error wrapper
are deleted without a barrel, facade, replacement abstraction, or public
package export.

See [[services/example-todo/AGENTS|the Example Todo service router]],
[[services/example-todo/src/service/model/dto/workspace-id|the workspace DTO]],
[[services/example-todo/src/service/model/ports/clock|the clock port]], and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README#Example Todo Root Model|the active checkpoint record]].

### Bag Of Keywords

service, model, owner, module, contract, identity, scope, port, context,
deletion.

## 2026-07-27 - Persistence Narrows Through The Service Root

A database is an optional persistence interior owned by one standalone
service. Its migrations, schemas, and stores form one positively closed root
boundary. It is not a module, provider, resource, project, helper namespace,
or alternate service face, and embedded API services do not acquire a second
database interior.

The host supplies a ready external database resource through initial context.
Named root middleware may combine that dependency with service-owned database
source and project narrow store capabilities downward. Module handlers consume
those capabilities from inherited oRPC context; they do not import database
source or reconstruct persistence. Habitat closes the destination and the
literal import funnel while runtime behavior remains owned by the service and
its tests.

See [[.habitat/blueprints/database/skill|the database frame]],
[[.habitat/blueprints/service/skill|the service frame]], and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the active lifecycle record]].

### Bag Of Keywords

database, persistence, migration, schema, store, resource, provider, host,
base, middleware, context, module, handler, closure.

## 2026-07-27 - Client Is The Only Package Face

The service spine is private implementation. A caller crosses one package
boundary through `client.ts`, which creates the typed local client and exposes
only the contract and input admission deliberately needed to call the service.
The router, host context lanes, schemas, model, and module interiors do not
become public merely because they are reachable inside the package.

This boundary is a deletion, not a facade. The package has no root export,
`index.ts`, input subpath, router subpath, contract subpath, or compatibility
alias. Callers receive one stable client surface while the service remains free
to preserve its sealed downward flow from host context through module routers
and authored operation handlers.

See
[[services/agent-plugin-lifecycle/src/client|the lifecycle client]],
[[services/agent-plugin-lifecycle/AGENTS|the service router]], and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/specs/agent-plugin-lifecycle-service-topology/spec|the active topology contract]].

### Bag Of Keywords

client, service, contract, input, boundary, caller, context, router, schema,
closure, deletion.

## 2026-07-27 - Source Law Uses Native Visibility

Nx schedules one selected Habitat source-law task. Habitat evaluates the
twenty admitted rules once inside that task. Nx filters its file inventory
through `.nxignore`; Habitat and Grit retain their own native visibility. A
cacheable Nx fileset therefore cannot represent the evaluator's complete read
surface.

The source-law task stays uncached rather than introducing another file
enumerator, digest, ignore synchronizer, or root-file exception. It does not
claim exclusive scheduler access: Nx may run independent graph work beside the
task while Habitat owns bounded rule execution inside its one process. The
command, rule selection, hooks, dependencies, and green admission boundary
remain unchanged.

See [[nx.json|the Nx workspace configuration]],
[[scripts/habitat/project.json|the Habitat project]], and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/tasks|the active tasks]].

### Bag Of Keywords

scheduler, task, owner, input, visibility, cache, concurrency, rule, hook,
evidence.

## 2026-07-27 - Temporary Marketplace Is A Scoped Resource

Disposable provider testing reads exact Git objects, then exposes those bytes
through one temporary local marketplace. The Providers handler owns selection,
marketplace meaning, native observation, and mutation. The content-workspace
resource owns only bounded filesystem materialization through its existing
Effect provider. The service never imports platform mechanics.

The resource allocates one fresh child below the caller's explicit disposable
root with Effect's scoped temporary-directory capability. The child exists
through initial observation, source revalidation, final preflight, mutation,
and terminal observation, then scope closure removes exactly that allocation.
No path, handle, receipt, digest, record, or index survives the invocation.
The caller still owns the disposable parent and provider homes; test does not
infer deletion authority over paths it did not allocate.

The materialized marketplace contains the two exact Git-native manifests and
the complete payload tree those manifests name. Targeted mode narrows native
observation and mutation, not the truth of a copied manifest. Rewriting or
pruning those manifests would create another projection rather than expose the
selected Git interface.

See
[[resources/content-workspace/AGENTS|the content-workspace resource router]],
[[services/agent-plugin-lifecycle/src/service/modules/providers/AGENTS|the Providers module router]],
and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/service-domain-frame|the lifecycle domain frame]].

### Bag Of Keywords

scope, parent, child, bytes, Git, marketplace, handler, resource, provider,
selection, observation, mutation, cleanup, caller, home.

## 2026-07-27 - Native Commands Are Provider Boundaries

The CLI chooses a provider and an explicit home; it does not choose, identify,
or authenticate a provider executable. Each concrete provider adapter invokes
the operator's ordinary `codex` or `claude` command and delegates marketplace
and plugin behavior to that native command. The adapter owns only translation,
bounded observation, typed failure, serialization, and process lifetime. Live
provider inventory remains installed-state truth.

The process environment is therefore an operational precondition, not a new
lifecycle authority. A command selector that rewrites the requested native
home is ineligible for disposable acceptance because its behavior falsifies
the explicit-home boundary. That conflict is settled by selecting the native
command or correcting local installation, not by restoring public executable
flags, path authentication, wrapper inference, or help-derived capability
admission.

See
[[resources/native-agent-provider/AGENTS|the native-provider resource router]],
[[resources/native-agent-provider/providers/codex-effect-platform-node/AGENTS|the Codex provider router]],
[[resources/native-agent-provider/providers/claude-effect-platform-node/AGENTS|the Claude provider router]],
and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the active lifecycle record]].

### Bag Of Keywords

command, provider, native, home, adapter, operator, environment, inventory,
translation, observation, failure, process, refusal, settlement, deletion.

## 2026-07-27 - Platform Capability Narrows Through Context

Service behavior consumes ready capabilities. A concrete runtime mechanism
terminates at the host, which supplies the declared service context. Each
module projects only the capability its handlers need, and each oRPC handler
authors the operation that consumes it. Identifier generation follows this
funnel: the host owns randomness while task, tag, and assignment handlers own
when a new domain identity is required. The generated candidate is untrusted
until the service-root TypeBox model admits it; admission precedes every
repository mutation.

Deterministic hashing of admitted bytes is pure policy, not runtime
acquisition. Each owning workspace policy uses the pinned portable SHA-256
implementation locally; a workspace binding is not misclassified as a release
content digest merely to reuse a function. This computation does not justify a
resource, provider, helper facade, or alternate domain owner. Habitat enforces
the platform distinction across the entire production-service corpus once
every concrete platform import has been removed.

See
[[services/example-todo/src/service/base|the Example Todo service base]],
[[services/example-todo/src/service/model/policy/identifier|the identifier policy]],
[[services/agent-plugin-lifecycle/src/service/model/policy/clean-content-workspace|the clean-content policy]],
and
[[.habitat/blueprints/service/require_service_boundary_platform_independence/rule|the platform-independence law]].

### Bag Of Keywords

service, context, host, module, handler, policy, bytes, hash, identity,
randomness, platform, resource, provider, portability, closure.

## 2026-07-27 - Digest Meaning Has Direct Owners

A digest is inert verification identity for one qualified lifecycle domain.
Content, release-input, payload, individual-release, and complete-set digest
structure, prefixes, brands, and generated types belong to one direct
service-root TypeBox DTO. Exact diagnostic admission and deterministic SHA-256
construction from bytes belong to one matching policy.

The active cut rewires consumers to those exact owners and deletes production
`service/shared` rather than renaming the aggregate. A digest does not become a
persistence key, address, lookup handle, provider identity, or installation
identity. No barrel, alias, facade, compatibility path, or exported generic
digest framework replaces the deleted owner.

See
[[services/agent-plugin-lifecycle/src/service/model/dto/release-digest|the release-digest DTO]],
[[services/agent-plugin-lifecycle/src/service/model/policy/release-digest|the release-digest policy]],
and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the active lifecycle record]].

### Bag Of Keywords

digest, schema, type, policy, bytes, prefix, identity, verification, directness,
deletion.

## 2026-07-27 - Identity Structure And Admission Have Direct Owners

Release identities and release-relative paths are inert service-wide meaning
used across release, packaging, provider, vendor, and governance capabilities.
Their TypeBox schemas, generated branded types, and structural bounds belong to
one direct service-root DTO. Their diagnostic admission belongs to one direct
policy. Consumers import those qualified owners rather than a transitional
primitive aggregate.

Current-main Git refs and blob identities remain current-main meaning. Their
shapes stay with the current-main Git DTO, while live parsing and construction
belong to the matching policy. The mixed `current-main-primitives` facade, its
renamed parser aliases, and an unused comparison are deleted. Digest meaning
remains in the transitional primitive leaf for the next complete cut; this
checkpoint does not create a general identity library or move native
mechanics.

Vendor workspace authority uses the same service-wide repository and content
identities. A Vendor upstream value that tells the versioned-content resource
where to fetch is instead a qualified locator; it must not inherit repository
identity merely because the first protocol named its field that way.

See
[[services/agent-plugin-lifecycle/src/service/model/dto/release-identity|the release-identity DTO]],
[[services/agent-plugin-lifecycle/src/service/model/policy/release-identity|the release-identity policy]],
[[services/agent-plugin-lifecycle/src/service/model/dto/current-main-git|the current-main Git DTO]],
[[services/agent-plugin-lifecycle/src/service/model/policy/current-main-git|the current-main Git policy]],
and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the active lifecycle record]].

### Bag Of Keywords

identity, path, schema, type, policy, admission, owner, locality, directness,
facade, deletion, digest.

## 2026-07-27 - Contract Constants Follow Their Structure

Protocol versions and structural bounds belong beside the TypeBox DTO whose
shape they constrain. Reuse does not turn them into generic primitives:
consumers import the qualified owner directly. Payload protocol, entry bounds,
byte bounds, and normalized file mode belong to the payload DTO. Release-input,
ownership, individual-release, and complete-set versions and bounds belong to
their corresponding DTOs.

Structure and admission remain distinct. TypeBox owns normalized mode schema
and generated type in the payload DTO; payload-manifest policy owns the exact
diagnostic parser. The public input boundary re-exports its two established
release-input limits directly from their owner without a local alias. Unused
version aliases are deleted. The residual transitional primitive leaf retains
only release identity and digest meanings for the next owner-sized cuts.

See
[[services/agent-plugin-lifecycle/src/service/model/dto/agent-plugin-payload|the payload DTO]],
[[services/agent-plugin-lifecycle/src/service/model/dto/release-input|the release-input DTO]],
[[services/agent-plugin-lifecycle/src/service/model/policy/payload-manifest|the payload-manifest policy]],
and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the active lifecycle record]].

### Bag Of Keywords

contract, version, bound, mode, schema, type, policy, admission, owner, direct,
residual, deletion.

## 2026-07-27 - Complete Release Set Is Service-Wide Meaning

A complete release set is closed in-memory domain data shared by Releases,
Packaging, and Providers. One direct service-root TypeBox DTO owns member, body,
and envelope structure and generated types. One direct policy owns
construction, admission, relationship checks, deterministic diagnostics,
bounds, and immutability. One direct codec owns the digest-free canonical body
preimage and envelope bytes.

The set digest verifies those bytes; it is not a store address, provider
identity, retention key, or lookup handle. The complete set preserves exact
witness membership, ownership, provenance, ordering, release-input identity,
and release-digest binding without a persistent set artifact. Consumers import
the qualified owners directly. The transitional release-set implementation and
release barrel are deleted rather than preserved through an alias, facade, or
compatibility path; only the explicitly transitional primitive leaf remains
for the next bounded cut.

See
[[services/agent-plugin-lifecycle/src/service/model/dto/agent-plugin-release-set|the release-set DTO]],
[[services/agent-plugin-lifecycle/src/service/model/policy/agent-plugin-release-set|the release-set policy]],
[[services/agent-plugin-lifecycle/src/service/model/policy/agent-plugin-release-set-codec|the release-set codec]],
and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the active lifecycle record]].

### Bag Of Keywords

set, member, witness, ownership, provenance, digest, order, closure, schema,
policy, codec, memory, deletion.

## 2026-07-27 - Individual Release Is In-Memory Domain Data

An individual agent-plugin release is verified in-memory domain data. Its
release digest verifies a digest-free canonical body; neither the digest nor
the release is a storage address, store handle, provider identity, or local
installation. The admitted payload remains attached as verified bytes rather
than being recast as a persistent artifact.

One direct service-root TypeBox DTO owns release body and envelope structure
and generated types. One direct release policy owns construction, admission,
verification, decoding, defensive freezing, and diagnostics. One direct codec
owns canonical body and envelope projection and bytes. Consumers import those
exact leaves without an alias, facade, or compatibility path. Release-set
policy temporarily retains cross-member relationships while artifact body,
artifact digest, artifact protocol, and local storage identity are deleted.

See
[[services/agent-plugin-lifecycle/src/service/model/dto/agent-plugin-release|the individual-release DTO]],
[[services/agent-plugin-lifecycle/src/service/model/policy/agent-plugin-release|the individual-release policy]],
[[services/agent-plugin-lifecycle/src/service/model/policy/agent-plugin-release-codec|the individual-release codec]],
and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the active lifecycle record]].

### Bag Of Keywords

release, payload, digest, identity, memory, schema, policy, codec, authority,
boundary, deletion.

## 2026-07-27 - Release Input Has Direct Policy And Codec Owners

Release input has three adjacent, nonoverlapping owners. The existing TypeBox
DTO remains structural authority for body and envelope schemas, generated
types, and the admitted brand. One direct service-root policy owns construction,
verification, decoding, bounded admission, defensive freezing, and diagnostics.
One direct codec owns canonical body and envelope projection and bytes.

Consumers import the exact policy or codec leaf directly. The transitional
`shared/release/release-input.ts` implementation and its release-barrel exports
are deleted without an alias or facade. Canonical bytes and digests, issue codes
and order, bounds, and public oRPC behavior remain unchanged. Primitives,
resources, providers, routers, and native state stay outside this checkpoint.

See
[[services/agent-plugin-lifecycle/src/service/model/dto/release-input|the release-input DTO]],
[[services/agent-plugin-lifecycle/src/service/model/policy/release-input|the release-input policy]],
[[services/agent-plugin-lifecycle/src/service/model/policy/release-input-codec|the release-input codec]],
and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the active lifecycle record]].

### Bag Of Keywords

input, schema, policy, codec, identity, bounds, order, diagnostics, freeze,
direct, delete.

## 2026-07-27 - Completeness Witness Is One Policy

A completeness witness is inert release meaning shared by release-input
construction and complete-set verification. TypeBox owns its closed persisted
structure and generated types in the release-input DTO. One direct service-root
policy owns witness construction, bounded admission, canonical ordering,
duplicate refusal, ownership-member closure, defensive freezing, and canonical
projection.

The witness owner stops at the witness boundary. Release-set policy retains the
relationships between the witness, the containing set header, set membership,
and the derived release payloads. This distinction keeps intrinsic witness
meaning together without turning the root policy into a generic relationship
engine. The transitional release-input file no longer defines or exports
witness policy, and release-set imports the exact policy leaf directly.

See
[[services/agent-plugin-lifecycle/src/service/model/policy/completeness-witness|the completeness-witness policy]],
[[services/agent-plugin-lifecycle/src/service/model/dto/release-input|the release-input DTO]],
and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the active lifecycle record]].

### Bag Of Keywords

witness, schema, policy, input, set, member, ownership, order, bound, freeze,
projection, direct, delete.

## 2026-07-27 - Provenance Binding Is One Policy

A provenance binding is inert release meaning carried by release inputs,
individual releases, complete sets, and Vendor-authored content. TypeBox owns
its closed structure in the release-input DTO. One direct service-root policy
now owns bounded admission, canonical ordering, duplicate-identity refusal,
defensive freezing, and canonical projection.

Those behaviors move together because splitting projection, ordering, or
admission would create several owners for the same binding identity. Release
input, release, and release-set policy import the exact owner directly. The
transitional release-input file no longer defines or exports that policy, and
no barrel, alias, facade, resource, provider, or alternate format replaces it.

See
[[services/agent-plugin-lifecycle/src/service/model/policy/provenance-binding|the provenance-binding policy]],
[[services/agent-plugin-lifecycle/src/service/model/dto/release-input|the release-input DTO]],
and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the active lifecycle record]].

### Bag Of Keywords

provenance, binding, schema, policy, order, bound, duplicate, freeze,
projection, direct, delete.

## 2026-07-27 - Release Input Structure Is Cross-Module Meaning

A release input is selected in Releases but its admitted structure is consumed
by release construction, complete-set verification, Packaging, Providers,
Vendors, and Governance. That inert contract therefore belongs to one
service-root TypeBox DTO, not to a module and not to the transitional
`shared/release` aggregate.

The DTO owns the closed body and envelope schemas, generated declaration types,
member expectation, completeness witness, and admitted release-input brand.
Construction, verification, canonical encoding, diagnostics, ordering, and
digest policy remain in their existing implementation owner until a later
complete cut can give them qualified destinations. Consumers name the DTO
directly; the old barrel exports and dead builder-version alias are deleted
without a replacement face.

See
[[services/agent-plugin-lifecycle/src/service/model/dto/release-input|the release-input DTO]],
[[services/agent-plugin-lifecycle/AGENTS|the lifecycle service router]],
and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the active lifecycle record]].

### Bag Of Keywords

input, contract, schema, type, brand, owner, boundary, funnel, direct, delete.

## 2026-07-27 - Raw Value Admission Is Not A Schema

TypeBox remains the structural authority for release contracts. Before those
aggregate contracts can be checked, release policy still needs bounded
traversal and the established field-level diagnostic vocabulary for raw
JavaScript values. That narrower meaning has one direct value-admission policy
owner; it is not a second schema, parser framework, or generic validation
surface.

The successful-or-failed result eliminator belongs with the release-result
algebra because it preserves a successful value by identity or appends failed
diagnostics by identity and order. Consumers import both exact owners directly.
The old `shared/release/parse.ts` grouping is deleted without a barrel, alias,
facade, or compatibility path.

This checkpoint changes no TypeBox schema, primitive, digest, resource,
provider, runtime, router, oRPC surface, or public result.

See
[[services/agent-plugin-lifecycle/src/service/model/policy/release-value-admission|the value-admission policy]],
[[services/agent-plugin-lifecycle/src/service/model/policy/release-result|the release-result policy]],
and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the active lifecycle record]].

### Bag Of Keywords

value, admission, result, bound, diagnostic, schema, policy, identity, order,
direct, delete.

## 2026-07-27 - Distribution Ownership Has Direct Owners

Distribution ownership is inert service-wide release meaning used by
release-input admission, individual release projection, and complete-set
verification. Its structure and semantics belong to the service model rather
than a transitional `shared` release face.

The DTO owns the closed TypeBox schemas, generated types, and admitted index
brand. Policy owns claim synthesis, admission, bounds, canonical ordering and
projection, immutability, member coverage, conflict classification, and
owner-local selection. Consumers import those exact leaves directly; the old
ownership file is deleted and its tests move without a barrel, alias, facade,
or compatibility path.

Primitive identity, parsing, and digest mechanics remain separate. This
checkpoint changes no resource, provider, runtime, router, oRPC surface, or
public result.

See
[[services/agent-plugin-lifecycle/src/service/model/dto/distribution-ownership|the ownership DTO]],
[[services/agent-plugin-lifecycle/src/service/model/policy/distribution-ownership|the ownership policy]],
and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the active lifecycle record]].

### Bag Of Keywords

ownership, claim, index, schema, policy, conflict, order, bound, freeze,
direct, delete.

## 2026-07-27 - Payload Meaning Has Direct Owners

Agent-plugin payloads are inert service-wide release data used by root policy
and the Releases, Packaging, and Providers modules. Their structure, manifest
semantics, canonical encoding, and admitted construction are distinct
meanings, but they belong to one service model rather than a transitional
`shared` release face.

The DTO owns the existing manifest TypeBox schema and branded in-memory types.
Manifest policy owns parsing, ordering, derivation, duplicate reporting, and
exact equality. Codec policy owns canonical JSON projection and bytes. Payload
policy owns construction, verification, bounds, cloning, freezing, and trusted
byte access. Consumers import those exact leaves directly; the old file,
barrel exports, and repeated manifest comparators disappear.

Full TypeBox payload admission is deliberately outside this checkpoint.
Replacing the existing granular parser now would change diagnostic vocabulary
unless another mapping layer duplicated structural authority. The ownership
move therefore preserves the current schema, bytes, bounds, diagnostics, and
digest behavior while exposing that later contract decision cleanly.

See
[[services/agent-plugin-lifecycle/src/service/model/dto/agent-plugin-payload|the payload DTO]],
[[services/agent-plugin-lifecycle/src/service/model/policy/payload-manifest|the manifest policy]],
[[services/agent-plugin-lifecycle/src/service/model/policy/agent-plugin-payload-codec|the payload codec]],
[[services/agent-plugin-lifecycle/src/service/model/policy/agent-plugin-payload|the payload policy]],
and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the active lifecycle record]].

### Bag Of Keywords

payload, manifest, bytes, bound, clone, order, schema, policy, codec, owner,
direct, delete.

## 2026-07-27 - Canonical Text Ordering Is Service Policy

Canonical UTF-8 text order is service-wide release meaning. It governs record
construction, source admission, projection, and packaging across root model
policy and the Releases, Providers, and Packaging modules. That meaning has
one direct service-root policy owner rather than living in a transitional
release primitive or a module-local copy.

Consumers import the policy directly. The old barrel face and the duplicate
Cowork comparator disappear, while Cowork retains its distinct byte-length
mechanic. This cut changes no TypeBox schema, digest implementation, platform
dependency, resource, provider, runtime, or public contract. Digest ownership
remains a separate blocked design boundary because the transitional primitive
still imports Node crypto.

See
[[services/agent-plugin-lifecycle/src/service/model/policy/canonical-text-ordering|the canonical text-ordering policy]]
and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the active lifecycle record]].

### Bag Of Keywords

text, UTF-8, bytes, order, prefix, policy, owner, module, direct, delete.

## 2026-07-27 - Canonical Encoding Has Exact Model Owners

Canonical encoding is service-wide release meaning, but it is not one generic
codec boundary. The recursive JSON type describes what pure serializers may
accept. JSON and Base64 policy own their distinct byte conventions and bounded
decoding diagnostics. Byte equality is one small subordinate mechanic used by
record policies after decoding. Each meaning therefore has one direct leaf.

Concrete persisted records still own their TypeBox schemas and runtime
validation. The JSON type does not become a second schema, and decoding returns
`unknown` for the owning record policy to admit. Modules reach service-wide
leaves through the private alias; root model and transitional release sources
use direct relative paths. Deleting the old `shared` file also exposes and
removes three duplicate byte comparators rather than merely relocating one
copy.

See
[[services/agent-plugin-lifecycle/src/service/model/dto/canonical-json|the canonical JSON DTO]],
[[services/agent-plugin-lifecycle/src/service/model/policy/canonical-json|the canonical JSON policy]],
[[services/agent-plugin-lifecycle/src/service/model/policy/canonical-base64|the canonical Base64 policy]],
[[services/agent-plugin-lifecycle/src/service/model/helpers/byte-equality|the byte comparison mechanic]],
and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the active lifecycle record]].

### Bag Of Keywords

JSON, Base64, bytes, encoding, decoding, bound, diagnostic, DTO, policy,
helper, owner, direct, delete.

## 2026-07-26 - Internal Results Are Not Transport Contracts

The generic release result is an internal computational algebra shared across
the service. Its discriminant separates a successful value from an ordered,
nonempty diagnostic tuple. It does not define any caller-facing operation
result: each oRPC operation retains its concrete, bounded TypeBox contract in
the module that owns that boundary.

The DTO owns the union's structure. Policy owns construction and length
narrowing. Those policy functions preserve the caller's value or issue
collection by identity and do not freeze, copy, sort, or otherwise add
semantics. Consumers import the two leaves directly. The old `shared` result
file and barrel face disappear without an alias.

See
[[services/agent-plugin-lifecycle/src/service/model/dto/release-result|the release result DTO]],
[[services/agent-plugin-lifecycle/src/service/model/policy/release-result|the release result policy]],
and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the active lifecycle record]].

### Bag Of Keywords

Result, branch, value, issue, tuple, DTO, policy, schema, boundary, identity,
order, direct, delete.

## 2026-07-26 - Diagnostics Are Boundary Data

A release diagnostic is structured validation data returned inside ordinary
operation results. It is not an Effect failure or an oRPC error. Because
Releases, Packaging, Providers, Vendors, and Governance consume the same
meaning, its closed TypeBox DTO belongs at the service root. Operation-specific
issues remain inside their owning modules.

The DTO owns vocabulary and structure. Policy owns bounded construction,
immutability, and canonical ordering. Readers import those leaves directly;
there is no barrel, compatibility alias, or generic `issue` destination. This
separates description from decision while leaving external mechanics and
operation sequence untouched.

See
[[services/agent-plugin-lifecycle/src/service/model/dto/release-issue|the release diagnostic DTO]],
[[services/agent-plugin-lifecycle/src/service/model/policy/release-issue|the release diagnostic policy]],
and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the active lifecycle record]].

### Bag Of Keywords

Diagnostic, schema, code, bound, order, DTO, policy, owner, module, service,
direct, delete.

## 2026-07-26 - Invocation Snapshots Belong To Operations

A request snapshot taken before the first resource yield is part of an
operation's temporal authorship. It is neither reusable domain policy nor a
second callable boundary. The oRPC handler should visibly take the defensive
copy, derive its plan, perform the resource transition, and classify the
result.

Inlining this one-use snapshot deletes a detached router function without
inventing a model export. Caller mutation remains unable to change the
in-flight request, and the module retains one obvious execution sequence.

See
[[services/agent-plugin-lifecycle/src/service/modules/releases/router/refresh-release-input.router|the refresh operation]]
and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the active lifecycle record]].

### Bag Of Keywords

Router, operation, input, snapshot, context, resource, sequence, delete, narrow.

## 2026-07-26 - Aggregate Bounds Are Service Policy

One aggregate payload limit governs release-input admission, clean and staged
content observation, and Provider source admission. That meaning spans modules,
so it belongs in one service-root policy leaf. Leaving the limit in the invalid
`service/shared` tree while moving only its arithmetic would make the new owner
depend on the old one and preserve two destinations for the same concept.

Move the bound, its checked addition, and its result together. Modules import
that policy through the private service alias; root policy uses a relative
model import. Delete the old definitions and exports without a compatibility
face. The operation sequence, TypeBox contracts, release bytes, and provider
behavior remain unchanged.

See
[[services/agent-plugin-lifecycle/src/service/model/policy/release-payload-accounting|release payload accounting]]
and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the active lifecycle record]].

### Bag Of Keywords

Owner, policy, bound, aggregate, payload, service, module, fact, delete, narrow.

## 2026-07-26 - Resources Return Admitted Facts

A ready resource owns the mechanical meaning of the facts it returns. For
versioned content, a reported blob identifier and its materialized bytes are one
resource fact. Recomputing that Git identity inside Vendor policy duplicates the
provider and turns a contract-breaking test double into an admitted product
state.

Vendor still owns the semantic join between two independent resource calls. A
ref can advance after observation and before materialization, so Vendor compares
repository, ref, path, commit, tree, object format, and ordered entries before
authoring. It also owns the root `SKILL.md` requirement, payload identity,
provenance, and defensive byte cloning. Resource mechanics flow down once;
module policy does not rebuild them.

See
[[resources/versioned-content/AGENTS|the versioned-content resource]],
[[services/agent-plugin-lifecycle/src/service/modules/vendors/AGENTS|the Vendor module]],
and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the active lifecycle record]].

### Bag Of Keywords

Resource, provider, fact, context, Vendor, policy, observe, materialize,
identity, drift, payload, delete, narrow.

## 2026-07-26 - Provider Handlers Author Native Operations

The native-provider resource owns command mechanics and live provider state.
Provider policy owns typed assessment, plans, bounds, and public
classification. The `status`, `sync`, and `test` oRPC handlers own the temporal
sequence that joins them. A detached reconciliation engine obscures that
ownership even when its behavior is correct.

Keep acquired sessions and other state-owning resource values local to the
procedure. Let each handler visibly acquire, observe, revalidate, mutate, and
settle. Give only inert facts to model policy. Delete the engine rather than
renaming it, and preserve the exact failure phase, applied prefix, target
ordering, final verification, and cancellation behavior that callers already
observe.

See
[[services/agent-plugin-lifecycle/src/service/modules/providers/AGENTS|the Providers module]]
and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the active lifecycle record]].

### Bag Of Keywords

Provider, resource, session, context, router, operation, policy, fact,
transition, failure, settle, delete, narrow.

## 2026-07-26 - Provider Results Are Policy

A Provider router leaf exists only when it authors an oRPC operation. Aggregate
classification, rejected-target projection, issue collection, and target
ordering are inert module policy. Housing those decisions in a file named
`result.router.ts` falsely suggests another operation surface and obscures the
actual handlers.

Move those decisions into the Provider model and delete the false router.
Selected-content observation already has one policy owner, so callers use that
owner directly rather than retaining a pass-through wrapper. Native observation
and mutation remain the next separate operation-authorship cut.

See
[[services/agent-plugin-lifecycle/src/service/modules/providers/AGENTS|the Providers module]]
and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the active lifecycle record]].

### Bag Of Keywords

Provider, router, operation, result, policy, projection, order, delete, narrow.

## 2026-07-26 - Provider Channels Author Selection

Provider status and sync own governed channel selection. The host supplies one
ready content-workspace resource; Provider middleware passes that resource
downward without wrapping it; each oRPC handler sequences the external reads
and gives typed facts to inert policy. Status performs one complete selection.
Sync defines one lazy, procedure-local selection and repeats it only before a
required mutation.

The channel resolver, narrowed read port, and caller-facing selection helper
are false intermediate owners. They hide the resource calls without adding a
capability. Delete them rather than renaming them. Current-main and release
derivation remain service-root collaborations because multiple modules consume
their inert meanings. Provider source-interface and selected-content policy
remain module-owned because only Provider interprets those facts.

This checkpoint does not move native observation or mutation out of the
existing reconciliation functions. That is the next operation-authorship cut,
not a reason to mix two semantic stories.

See
[[services/agent-plugin-lifecycle/src/service/modules/providers/AGENTS|the Providers module]]
and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the active lifecycle record]].

### Bag Of Keywords

Provider, channel, resource, context, router, operation, policy, fact,
selection, repeat, mutation, delete, narrow.

## 2026-07-26 - Provider Tests Author Selection

The disposable Provider test operation owns exact local-content selection. The
host supplies one ready content-workspace resource through service and module
context; the handler sequences that resource directly, and pure policy
classifies source-interface facts and projects the selected content from the
service-root release derivation.

Each selection performs a complete clean observation, validates the native
marketplace interface, rereads its local manifests, then repeats those checks
before native mutation. There is no detached runner, caller dependency bag,
clean-content reader, workspace resolver branch, or memoized selection. The
channel resolver remains only for status and sync, so this checkpoint narrows
Provider test source ownership without claiming the complete Providers shell is
sealed. Native observation and mutation still use the existing reconciliation
functions and remain a later operation-authorship cut.

Provider source-interface, selected-content, and native-state policy occupy
separate direct model leaves. The service-root content-workspace DTO is also a
direct model leaf; a same-kind nested model directory is not an ownership
boundary.

See
[[services/agent-plugin-lifecycle/src/service/modules/providers/AGENTS|the Providers module]]
and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the active lifecycle record]].

### Bag Of Keywords

Provider, resource, context, operation, policy, source, selection, observe,
revalidate, mutate, delete, narrow.

## 2026-07-26 - Import Spelling Reveals Ownership

Within one service module, a normalized relative import says that both leaves
belong to the same sealed domain owner. Module code uses the service-private
alias only for genuinely service-wide `service/model/**` meaning. Sibling
module implementation, root runtime, and unowned shared paths do not become
valid merely because an alias can spell them.

Root contract and router composition use exact relative module edges.
Cross-package capabilities use package exports. Nx resolves both same-project
spellings to the same project, so this is a colocality and ownership law rather
than graph optimization.

See [[.habitat/blueprints/service/skill|the service frame]],
[[.habitat/AUTHORITY|Habitat authority]], and
[[services/agent-plugin-lifecycle/AGENTS|the lifecycle service router]].

### Bag Of Keywords

Owner, module, model, relative, alias, boundary, graph, closure.

## 2026-07-26 - Staged Index Facts Cross Once

The Git provider owns staged-index framing, decoding, bounds, object ID width,
generic paths, path-stage duplicates, and ordering. Its resource contract
returns frozen mode, object ID, stage, and path facts. Conflict stages and
nonregular modes remain facts because only Releases can decide that they mean a
dirty or invalid release source.

Releases middleware passes the ready resource reference downward without
building a reader or result mirror. Router handlers invoke it and translate its
typed failures. Pure policy brands release paths, detects portable collisions,
classifies nonregular modes before conflict stages, verifies opening and closing
facts, and derives the staged binding from the complete typed entry set. Raw
index bytes never cross this public staged boundary.

See [[resources/content-workspace/AGENTS|the content-workspace resource]],
[[services/agent-plugin-lifecycle/src/service/modules/releases/AGENTS|the Releases module]], and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the active lifecycle record]].

### Bag Of Keywords

Resource, provider, runtime, context, module, router, policy, fact, authority,
closure, stage, mode, entry, bound, decode, classify, direct, typed, frozen.

## 2026-07-26 - Providers Decode Native Protocols

A resource returns provider-neutral facts, not a provider's serialization.
Git owns `ls-tree` framing, object-format checks, and native output bounds, so
the Git provider decodes those bytes once, refuses exact duplicate wire paths,
and returns a closed typed entry set. The content-workspace contract names only
regular entry facts and their allocation bound.

Lifecycle consumers brand paths and apply release meaning after the resource
handoff. They defensively reject substituted duplicate facts and own canonical
release paths plus portable case and normalization collision policy. No raw
byte compatibility reader, generic Git facade, or second tree DTO crosses the
funnel.

See [[resources/content-workspace/AGENTS|the content-workspace resource]],
[[resources/content-workspace/providers/git-effect-platform-node/AGENTS|the Git provider]], and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the active lifecycle record]].

### Bag Of Keywords

Provider, resource, protocol, fact, schema, path, entry, bound, decode,
validate, freeze, return, brand, classify, consume, direct, typed, closed,
narrow.

## 2026-07-26 - Resources Name External Capabilities

An external capability is not policy merely because one module currently calls
it. A resource names one provider-neutral capability; a provider implements its
acquisition, use, and release mechanics; the app selects provider and lifetime;
runtime executes those mechanics and binds the ready capability into service
context; module middleware projects it; router handlers sequence calls; policy
interprets facts and makes domain decisions.

This is a funnel, not a web. A model file that acquires remote content, reads a
workspace, publishes output, or invokes a native provider is an ad hoc resource
assembly in the wrong layer. Extract the provider-neutral operation, not the
whole workflow. Vendor identity, fast-forward admission, payload equivalence,
and authoring decisions remain Vendor policy while remote versioned-content
observation becomes a resource. Existing content-workspace mechanics remain
their own resource; current-main persistence remains service-owned storage.

See [[.habitat/blueprints/service/skill|the service frame]],
[[resources/content-workspace/AGENTS|the workspace resource]], and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/service-domain-frame|the lifecycle domain frame]].

### Bag Of Keywords

Provider, resource, app, runtime, service, module, router, policy, context,
fact, decision, operation, flow, owner, narrow, extract.

## 2026-07-26 - Resources Stay Effectful

A provider realizes one neutral resource contract. The host selects that
provider, receives the ready Effect capability, and passes it into the service
context. Modules may narrow that capability through middleware, while router
handlers sequence its operations and policy interprets the resulting facts.

A Promise mirror, detached runner, or service-local adaptation duplicates the
resource boundary and erases failure and interruption semantics. Delete the
mirror instead: bind runtime requirements once in the provider, keep typed
failure and cancellation native, and let every consumer use the same lazy
Effect operations. Vendor orchestration still hidden in policy is the next
visible red boundary; this checkpoint does not bless it.

See [[resources/content-workspace/AGENTS|the content-workspace boundary]] and
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the
active lifecycle record]].

### Bag Of Keywords

Provider, resource, Effect, host, context, module, router, policy, fact,
failure, interrupt, flow, delete.

## 2026-07-26 - Resources Remove Broad Context

The contract implementer and the middleware author are distinct native roles.
`base.ts` seeds the same complete initial context into both, but only the
implementer owns contract branches and router composition. The optional
`createMiddleware` factory returns the private native author, so module
middleware receives context provenance without acquiring another implementer.

Native context remains additive. A spelling blacklist cannot make it
subtractive and should not impersonate closure. The real narrowing move is to
classify outside-system mechanics as resource contracts, realize them through
providers, bind ready values at the host, and project owner-qualified
capabilities into module operations. Domain policy remains with the module;
resource mechanics leave it.

This supersedes the previous entry's claim that a reserved-lane source rule
alone closes handler context. The current checkpoint proves middleware
provenance and named attachment only. Promise mirrors, generic Effect
adaptation, detached runners, and broad resource assemblies remain visible
red work.

### Bag Of Keywords

Resource, provider, service, module, context, author, implementer, operation,
policy, host, bind, project, narrow, delete.

## 2026-07-26 - Context Exactness Is An Authoring Law

Native oRPC `.use(...)` composition adds middleware contributions to inherited
context; an explicit type argument cannot make that runtime or handler type
subtractive. The service therefore seeds its complete host context once,
authors named capability middleware from the base factory, and attaches those
completed values through inferred composition.

The exact module boundary is a source-authoring law. Handlers may use their
named capabilities but may not reopen `deps`, `scope`, `config`, `invocation`,
or `provided`. A wrapper, witness, adapter, or shadow `Context` type would only
hide the additive model, not narrow it. This supersedes the older ledger
wording that left an exact type-level authoring view open.

### Bag Of Keywords

Context, additive, infer, capability, middleware, source law, reserved lane,
factory, provenance, handler, exact, truthful.

## 2026-07-25 - One Base, Downward Context

The configured oRPC base establishes initial context before any middleware,
module, or handler exists. Reusable middleware is authored once from that base
or its qualified contract branch, then passed downward as a completed value.
The service implementer attaches it; a module composes it; a handler consumes
the resulting context.

A derived service or module branch must not become a second middleware
factory and then feed its output back into itself. That reverses the funnel,
duplicates context authority, and makes assembly circular. Base construction
owns provenance; middleware owns one transition; module composition owns
placement.

### Bag Of Keywords

Base, context, middleware, factory, service, module, handler, funnel,
provenance, transition, compose, downward.

## 2026-07-25 - Policy Supports Authorship

An operation handler owns the transition: it consumes context, sequences
effects, and returns the operation result. Pure decisions that classify a
resource outcome, project a domain identity, or bound a public diagnostic
belong in the module model. They support the handler without reconstructing
its execution environment.

Module context is declared and enriched in `module.ts`. Repeating service
telemetry at that layer is not context specialization when it contributes the
same fields and no module policy. Delete the duplicate, keep the required
service lifecycle, and leave exact context narrowing open until the runtime
boundary can prove it.

### Bag Of Keywords

Operation, handler, transition, context, policy, result, failure, telemetry,
owner, narrow, delete, exact.

## 2026-07-25 - Composition Has One Face

A module exposes one router face to its service root. Named router leaves
author operations or cohesive operation groups; module `router.ts` only
composes those completed values into the public branch object. A directory
index creates a second reachable face and obscures which layer owns
composition.

Moving the face does not repair the behavior behind it. Detached runners,
misplaced helpers, loose schema barrels, and broad context remain visible until
their own owner-local checkpoints delete them.

### Bag Of Keywords

Module, router, face, leaf, compose, operation, owner, public, delete, exact.

## 2026-07-25 - Selection Follows Consumer

An invocation-local model belongs to the module whose operations consume and
interpret it. Provider selected content exists only so status, test, and sync
can compare reviewed Git bytes with native inventory. Its DTOs, port,
marketplace policy, and resolution helper therefore narrow inside Providers.

Current-main and release derivation remain at the service root only for their
actual cross-module consumers. Passing the raw content-workspace capability
downward does not make provider selection shared, and moving the resolver out
of root middleware does not change Git or native-provider authority.

### Bag Of Keywords

Owner, provider, selection, context, resource, port, policy, helper, schema,
behavior, exact, delete, narrow.

## 2026-07-25 - Observation Follows Transition

An observation belongs to the transition whose policy interprets it, not to the
service root merely because an outside resource supplied the raw facts. Staged
index bindings exist so Releases can compare opening and closing source,
materialize bounded content, and decide release eligibility. Their DTOs, ready
port, resource adapter, and failure vocabulary therefore remain sealed
inside Releases.

The service context still carries the content-workspace resource downward.
That transport does not promote staged transition meaning into root ownership,
create a dependency registry, or authorize a second repository layer. This
checkpoint changes placement only; context, operation authorship, and runtime
behavior remain fixed.

### Bag Of Keywords

Observation, transition, release, module, resource, context, port, policy,
anchor, index, opening, closing, bounds, owner.

## 2026-07-25 - Capability Provision Is Not Context Narrowing

Native oRPC middleware merges contributed capabilities into its inherited
context. A smaller contribution therefore does not remove wider host or service
lanes from the handler type. Name such middleware for the capability it
provides and record it as enrichment until the base and module boundary prove
an exact authoring view.

This distinction keeps progress truthful. Removing a sibling implementation
edge and supplying a ready capability is valuable, but it does not close the
context funnel by itself. Exact narrowing belongs to the coherent root-context
checkpoint where reserved lanes can become unavailable to module handlers.

### Bag Of Keywords

Context, capability, middleware, merge, enrich, narrow, handler, boundary,
truth, exact.

## 2026-07-25 - Capabilities Cross Context

A capability used by several modules belongs at the service boundary only
when its meaning survives every consumer. Its port names what callers may ask;
its policy interprets those facts for the service domain. The host supplies the
outside resource once, and each module projects only the ready capability its
handlers need.

Passing that capability downward is not permission for modules to import one
another. A sibling implementation edge turns one module into an accidental
service root and hides the real handoff. Promote the shared meaning, keep each
operation in its router handler, and leave unrelated context repair for its own
checkpoint.

### Bag Of Keywords

Capability, context, port, policy, resource, service, module, handler,
projection, promote, narrow, sibling.

## 2026-07-25 - Shared Policy Stays Neutral

Service-level policy may be consumed by several modules without owning any
module's public result. It returns inert domain facts or neutral failure detail.
Each operation handler maps those facts into the request, result, issue, and
settlement vocabulary owned by its module.

Moving a module issue or response shape upward would not share policy; it would
spread one module's semantics across the service. Leaving genuinely common
derivation inside one module would create the opposite error: a sideways
implementation dependency. The root model holds only the meaning that survives
both consumers.

### Bag Of Keywords

Policy, fact, detail, module, handler, result, issue, neutral, map, root,
sideways.

## 2026-07-25 - One Router Face, Named Authorship

A service module has one public router face: module `router.ts`. It composes
completed values from named `router/*.router.ts` files and contains no operation
transition itself. The named files are the oRPC authoring sites: each owns one
operation or one meaningful group whose context, guard, or domain role holds it
together.

This is a narrowing hierarchy, not a choice between equivalent layouts. A
`router/index.ts` would create another reachable face; an inline handler in
module `router.ts` would collapse composition and authorship back together.
Habitat asserts the one positive shape. Future generic blueprint variants
belong upstream and are not a reason to recover local ambiguity.

### Bag Of Keywords

Module, router, leaf, group, handler, compose, context, guard, domain, face,
variant, upstream.

## 2026-07-24 - Documentation Explains Relations

JSDoc belongs at a declaration when another source file depends on its meaning.
It explains what the symbol owns or performs, why that boundary exists, and how
the symbol participates in module or system behavior. Wide callable boundaries
also explain the role of each parameter.

An `AGENTS.md` is the product-context and navigation surface at an ownership
boundary. It explains why the component exists, its behavior, concepts,
boundaries, flow, interfaces, routes, and validation without narrating the
implementation or duplicating JSDoc.

### Bag Of Keywords

Purpose, boundary, behavior, concept, flow, interface, route, symbol, import,
relation, parameter, module, context.

## 2026-07-24 - Ownership Follows Meaning

Access does not assign ownership. A fact belongs to the domain whose meaning it
carries, even when another layer consumes it. Hoisting for convenience creates
mirrors; moving shared meaning into one consumer creates sideways reach.
Context carries admitted capabilities downward without relocating their domain
meaning.

### Bag Of Keywords

Access, owner, meaning, domain, consumer, mirror, context, canonical, downward.

## 2026-07-24 - Capability Narrows Downward

A service is a narrowing capability funnel rather than a web of registries and
reconstructed contexts. The host admits external capability, the service owns
the capability suite, each module owns a subdomain, and each operation consumes
only the context admitted to that boundary. Reaching upward, sideways, or
around the operation signals a misplaced owner.

Effect owns execution, failure, interruption, and resources. Effect-oRPC owns
adaptation at the operation boundary. TypeBox owns structural schemas, types,
and validation. Domain policy owns decisions. Resources and providers own
outside-system mechanics.

See [[.habitat/blueprints/service/skill|the service frame]] for the current
direction and the adjacent Habitat packets for exact enforceable relations.

### Bag Of Keywords

Funnel, capability, context, service, module, operation, policy, resource,
provider, schema, downward, narrow, owner.

## 2026-07-24 - Routers Author Behavior

An oRPC operation is an executable leaf, not an assembly placeholder for a
second request-context-result API. Routers are where admitted input and context
become behavior. Pure reusable decisions may move into domain policy, and
outside work may cross a resource boundary, but the operation is not exported
as a detached runner.

Natural operation groups may share a guard or capability and compose as plain
router objects. Grouping signals semantics; it is not a device for hiding
operation logic or rebuilding context.

### Bag Of Keywords

Router, operation, handler, input, context, guard, group, policy, resource,
behavior, compose, native.

## 2026-07-24 - Direction Precedes Enforcement

A blueprint seed names the kind of thing, its ownership, its inward direction,
and the states toward which sound work should move. Habitat then closes invalid
filesystem and source relationships. Tests verify product behavior. None of
these surfaces should impersonate another.

A keyword bag is a selection instrument. Each entry is one weight-bearing word;
a two-word term is admitted only when it names one established concept.

### Bag Of Keywords

Direction, law, kind, owner, boundary, inward, context, behavior, structure,
source, test, choice.

## 2026-07-24 - Prompts Carry The Frame

A fresh challenge receives a fresh owner; continuing work stays with its
current owner. A useful prompt transmits the selected keyword bag, ownership
direction, authoritative grounding, falsifiers, write boundary, and expected
evidence. Habitat remains the correction latch rather than a substitute for
shared understanding.

### Bag Of Keywords

Fresh, owner, frame, bag, direction, ground, falsifier, scope, evidence, latch.
