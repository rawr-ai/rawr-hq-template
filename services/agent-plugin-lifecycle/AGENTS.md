# Agent Plugin Lifecycle Service Router

## Purpose

- Govern how reviewed agent-plugin content becomes a deterministic package and
  converges with native provider state.

## Scope

- Applies to `services/agent-plugin-lifecycle/**`.
- This oRPC service owns the curated agent-plugin capability boundary across
  release inputs, vendors, packaging, native-provider convergence, and
  current-main governance.

## Boundaries

- Consumers cross only through the declared `/client` package export.
  `src/client.ts` admits the callable client surface; `src/service/**` remains
  private implementation owned by this package.
- Personal's reviewed record owns desired plugin membership; exact Git objects
  own the selected bytes; native provider inventory owns installed state.
- The service model owns pure current-main selection, clean-content
  classification, declared-tree validation, release derivation, and release
  diagnostics only where those meanings span capability modules. Its TypeBox
  DTOs define diagnostic structure; its policy bounds construction and
  canonical ordering. Its generic release-result DTO and policy own only the
  internal computation discriminant, construction, nonempty narrowing, and
  identity-preserving elimination; concrete caller-facing result schemas
  remain with their operation modules. Raw-value admission policy owns only
  bounded traversal and established granular diagnostics before TypeBox
  aggregate checks; it is not a second schema or parser framework.
  Its canonical JSON DTO constrains pure serializer input; separate JSON and
  Base64 policy leaves own established encoding, while one byte-equality
  mechanic supports canonical record checks. Concrete record TypeBox schemas
  remain with their owning DTOs. Canonical UTF-8 text ordering has one
  service-root policy owner shared by record construction, projection, and
  packaging. Agent-plugin payload structure, manifest semantics, canonical
  encoding, and admitted construction have direct service-root DTO and policy
  owners; modules consume those leaves without a `shared` payload face.
  Distribution ownership structure and its admitted brand have one direct
  service-root DTO owner; synthesis, admission, bounds, canonical ordering and
  projection, immutability, member coverage, conflict classification, and
  owner-local selection have one direct policy owner. Release records consume
  those exact leaves without a `shared` ownership face. Release-input body and
  envelope structure, member declarations, provenance bindings, completeness
  witness, and admitted brand have one direct service-root TypeBox DTO owner.
  One direct service-root release-input policy owns construction,
  verification, decoding, bounded admission, defensive freezing, and
  diagnostics. One direct codec owns canonical body and envelope projection
  and bytes. Consumers import those exact leaves directly; the transitional
  release-input implementation and its release-barrel exports are deleted.
  Individual agent-plugin release body and envelope structure, generated
  types, and its admitted brand have one direct service-root TypeBox DTO
  owner. One direct release policy owns construction, admission, verification,
  decoding, defensive freezing, diagnostics, and the association with its
  verified in-memory payload. One direct release codec owns canonical body and
  envelope projection and bytes. The release digest is a verification value,
  never an artifact address, store handle, provider identity, or local
  installation identity. Artifact body, artifact digest, artifact protocol,
  and local storage identity are rejected rather than preserved behind another
  name. Complete release-set member, body, and envelope structure and generated
  types have one direct service-root TypeBox DTO owner. One direct release-set
  policy owns construction, admission, cross-member relationships,
  deterministic diagnostics, bounds, and immutability. One direct codec owns
  the digest-free canonical body preimage and envelope bytes. The release-set
  digest is a verification value, never storage or provider
  identity. Protocol versions and structural bounds live beside the TypeBox DTO
  they constrain; normalized file-mode structure belongs to the payload DTO
  while payload-manifest policy owns its diagnostic admission. Consumers
  import those exact leaves. Service-wide release identity and
  release-relative-path structure, generated branded types, and bounds have
  one direct TypeBox DTO owner; one matching policy owns exact diagnostic
  admission. Current-main Git structure remains with its qualified DTO while
  its parsing and construction belong to the matching policy. The identity
  alias facade is deleted. Content, release-input, payload, individual-release,
  and complete-set digest structure and generated branded types have one direct
  TypeBox DTO owner; one matching policy owns exact diagnostic admission and
  deterministic byte construction. Consumers import those exact leaves.
  Production `service/shared` is deleted rather than preserved as a barrel,
  facade, generic digest framework, persistence owner, or lookup boundary.
  Vendor workspace requests consume those service-wide identities. Vendor
  upstream records instead carry a qualified versioned-content repository
  locator plus the service-wide exact commit and tree identities; a locator is
  not promoted into repository identity.
  Provenance-binding policy owns bounded admission, canonical ordering,
  duplicate-identity refusal, defensive freezing, and canonical projection
  across release input, individual release, and complete-set records. Its
  closed TypeBox structure remains owned by the release-input DTO.
  Completeness-witness structure and generated types also remain in that DTO.
  Witness construction, admission, ordering, duplicate refusal, ownership
  closure, freezing, and canonical projection have one direct service-root
  policy owner. Release-set policy owns the relationships between that witness,
  the containing set, and the derived releases.
  Providers owns selected-content structure,
  source-interface classification, native marketplace validation,
  selected-content projection, and native-state policy because no other module
  consumes those meanings. Provider status, sync, and disposable test handlers
  directly sequence the ready content-workspace and native-provider resources;
  sessions stay operation-local and pure policy sees only admitted facts.
- The Releases module owns clean and staged eligibility operations and directly
  consumes one ready content-workspace resource. Its handlers own observation
  order and final revalidation; pure shared policy classifies the resulting Git
  facts. Native Git protocol remains in the resource provider.
- The Packaging module directly consumes ready content-workspace and
  package-output resources through separate named middleware contributions.
  Its package handler owns source observation, derivation, encoding,
  revalidation, publication, and settlement order; pure policy classifies
  typed facts and public results.
- Content-workspace, versioned-content, clock, package-output, and
  native-provider mechanics remain behind host-supplied dependencies.
- Pure deterministic byte policy may use a portable implementation directly;
  it must not create a resource or provider facade for computation without a
  runtime acquisition or lifecycle protocol.
- It does not own the Oclif installation, Personal repository contents, app
  composition, or provider-home state. Native provider inventory is the live
  installed-state authority.

## Behavior

- The service admits exact reviewed content, applies cross-module
  release-derivation policy, and dispatches package, vendor, and provider
  operations through their owning modules. Provider status, test, and sync
  derive their invocation-local selections in their operation handlers before
  native observation or mutation.

## Concepts

- A **reviewed channel record** declares desired membership; exact Git objects
  supply its selected bytes. A **release input** is the validated source set; a
  **package** is deterministic output; native **inventory** is the independent
  installed-state observation.

## Flow

- The host supplies ready capabilities to the context-seeded base boundary.
  The base exposes one separate native middleware author; each documented named
  module middleware contributes one owner capability, and `module.ts`
  attaches that middleware through inferred `.use(middleware)` composition.
  Operation handlers sequence ready resources and pass only typed facts into
  pure policy. Native context remains additive; owner-local cuts remove broad
  dependency access rather than hiding it behind a shadow `Context` type.

## Interfaces

- The public client is the sole caller boundary. It deliberately exposes the
  service contract and bounded input admission without exposing the private
  router, host context lanes, schemas, model, or modules. Content workspace,
  versioned content, lifecycle clock, package output, and ready native provider
  resources are host-supplied dependencies.

## Routing

- [Repository router](../../AGENTS.md)
- [Public client](src/client.ts)
- [Private service contract](src/service/contract.ts)
- [Service dependency boundary](src/service/base.ts)
- [Native-provider resource contract](../../resources/native-agent-provider/contract.ts)

## Validation

- Run `bunx nx run habitat:lint` and
  `bunx nx run @rawr/agent-plugin-lifecycle:typecheck`.
- Run `bunx nx run @rawr/agent-plugin-lifecycle:test` when lifecycle behavior
  changes.
