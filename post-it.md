# Working Frame Ledger

This is a prepend-only mental-model ledger, not architecture authority, a
backlog, or a second specification. Exact topology and source relationships
belong to [[.habitat/AUTHORITY|Habitat authority]] and its blueprint packets.
Durable lifecycle decisions belong to
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the active OpenSpec]].

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
