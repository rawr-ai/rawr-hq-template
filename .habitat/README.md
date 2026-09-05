# Habitat Authority

This repository's `.habitat/blueprints/**` tree is the canonical authoring
source copied into the selected Habitat policy-pack artifact. Repository-owned
overlays and `habitat.toml` selections are local policy input; they do not
become a second reusable blueprint authority.
[[AUTHORITY-ONTOLOGY|Habitat's authority ontology]] distinguishes kinds, rule
packets, instances, capabilities, governed communities, and resolved
execution.
[[BLUEPRINT-COMPOSITION|Blueprint composition]] keeps that definition graph
readable while preserving one ordinary manifest and Nx owner per repository
component. The SDK build copies authored paths unchanged into the selected
policy pack; each definition declares its complete runner-asset closure and
packaging does not flatten or reinterpret it.
Repositories retain authority for their own instances and overlays.

```text
.habitat/blueprints/<kind>/blueprint.toml
.habitat/blueprints/<kind>/structure.toml
.habitat/blueprints/<kind>/<rule>.md
.habitat/blueprints/<kind>/components/<role>/<rule>.md
.habitat/blueprints/<kind>/versions/<version>/blueprint.toml
.habitat/blueprints/<kind>/versions/<version>/structure.toml
.habitat/blueprints/<kind>/versions/<version>/<rule>.md
.habitat/blueprints/<kind>/versions/<version>/components/<role>/<rule>.md
.habitat/overlays/<niche>/rules/<rule>/
.habitat/staged/blueprints/<kind>/<rule>/
```

The top-level resource and service definitions remain the released version-1
locations. A successor below `versions/<version>/` is a complete immutable
closure, not an overlay: it declares every runner asset it uses. Selection is
an exact identity-and-version locator with no `include`, `contains`,
inheritance, ancestor or sibling asset traversal, generated staging, or
instance rewrite.

The component path is optional authoring organization for ordinary rules, not
a manifest or runtime concept. Every executable asset is declared by the
blueprint's existing rule list. Reserved `include` and `contains` relations may
later compose an independently reusable kind, but are not activated here.

The current selected generic kinds are:

- `package`: one closed product-free support shell whose test members are
  declared by the owning instance.
- `resource`: one closed provider-neutral capability contract and its nested
  provider-family boundary.
- `provider`: one closed typed realization nested beneath its parent resource,
  with a single public implementation index.
- `service`: the reusable contract-first oRPC capability funnel. Its one root
  structure owns the complete public client, private spine, module, model,
  persistence, and proof topology; focused source packets may be grouped by
  those roles without creating child instances.
- `plugin`: one closed generic projection project shell. Narrower plugin kinds
  own their role-specific source and test layout.
- `plugin-nx`: the independent closed Nx projection kind whose public index
  projects resolved rule applications into scheduler facts.
- `app`: one closed product-composition shell. Narrower app kinds own their
  host-specific runtime and entrypoint faces.

The SDK protocol-1 policy pack's sorted member inventory is declared in
[its manifest](../packages/core/sdk/habitat-pack.json).
Each member resolves its definition and runner assets from the selected
package with policy-pack provenance. A repository activates one only through
its own `habitat.toml` instance; an exact producer-source copy is inert, and a
different definition at the same identity fails resolution. The remaining
repository compatibility rules continue to execute beside resolved package
rule applications. The selected `service` definitions co-land their focused
positive law, native Nx generator, complete package closure, and
packed-consumer construction proof.
The `runtime-definition@1` member preserves the original cold private
definition closure. `runtime-definition@2` independently closes the
provider-plan authoring owner and its behavior proofs. The selected
`runtime-definition@3` preserves that cold contract with closed owner-local
TypeScript helper and proof subdirectories. Every version is independent and
immutable; none realizes `app@2`, live runtime execution, or a native host.
The `runtime-bootgraph@1` member preserves the original private package-less
lifecycle-ordering closure. The selected complete `runtime-bootgraph@2` admits
private helper and proof subdirectories. The SDK carries only definition and runner
assets, with no bootgraph implementation bundle, public bootgraph face, or
production SDK-to-bootgraph call before task 10.6. SDK integration tests supply
the already-admitted test-source/build edge.
The `runtime-compiler@1` member preserves the original private package-less
compiler closure. The selected complete `runtime-compiler@2` admits private
helper and proof subdirectories. The SDK carries only definition and runner assets, with no
compiler implementation bundle, public compiler face, or SDK-to-compiler
production call before task 10.6. SDK integration tests supply the
already-admitted test-source/build edge.
The complete `runtime-process-runtime@1` member closes private process binding
and execution, with a package-less source/proof grammar and no public SDK face.
Its complete v2 adds the narrow adapter import law without changing v1.
The complete `runtime-harnesses@1` closes the generic package-less native
contract owner and its import law. The SDK projects only import-safe companion
types; this member does not qualify a native host or introduce runtime mounting.

The complete `runtime-substrate-effect@1` member closes the private native
Effect provisioning owner. Its law carries no public runtime entrypoint.

The `runtime-derivation@1` member preserves its immutable topology-only
closure. `runtime-derivation@2` independently closes the finished private
derivation owner and its behavior proofs. The selected `runtime-derivation@3`
preserves those contracts with a closed owner-local TypeScript helper and proof
grammar. No version inherits, falls back to, or traverses another's assets.
The version-1 resource and service closures preserve the exact
`habitat-cli-v0.5.13` definition and runner-asset bytes. Their version-2
successors retain the same structure and semantic law while narrowing Grit
acquisition to definition-owned `rootPatterns`. Each definition exposes only
its required `project` anchor, so repository manifests cannot redirect source
independently.
`service@3` is the complete terminal-SDK-consumer successor. It retains the
version-2 structure and bounded acquisition while moving the official
Effect-oRPC bootstrap behind `@habitat-ai/sdk/plugins/server/effect`; direct
vendor bootstrap remains valid only for an SDK-internal service that cannot
depend on the terminal SDK without reversing the package graph.
Nested-member closure remains Habitat-owned. The closed package export law and
native Nx graph acceptance check foreign-consumer direction. The repository's
current process-runtime access packet rejects parser-visible private runtime
and concrete provider imports from ordinary production consumers. No activated
`@nx/enforce-module-boundaries` enforcement is implied by generated templates.

Compatibility packets below `agent-router`, `grit-pattern`, and `nx-workspace`
retain the current frame laws: agent-router document shape, Grit helper
documentation, and the closed repository script and hook topology. Durable
cross-kind `AGENTS.md` placement and qualified public-face JSDoc instead live as
repository law under `.habitat/overlays/repository`. The `nx-workspace` frame's
singular structural spine remains at its blueprint root. The
`workstream-plugin-pack` overlay closes that retained platform tool's asset
roots and requires checked-in SessionStart and Stop configuration to invoke its
canonical hook sources. Qualified overlays do not duplicate generic laws as
package-name or path blacklists.

Remaining v2 `rule.json` packets outside a selected kind are repository
compatibility law, not reusable kind authority. An intentionally unfinished
law lives under `.habitat/staged/blueprints/**` with a `staged-rule.json`
candidate manifest and has no enforcement authority until it is completed,
selected, and moved into its owning definition.

Each enforced v2 compatibility rule has a stable `rule.json` plus a locked
`baseline.json` beside it. Structure rules declare a blueprint-root or
packet-local `structure.toml`; Grit packets expose their executable source as
`pattern.md`. Rule-specific semantics belong in the packet directory and rule
metadata, not in a second filename convention. Structure rules own filesystem
topology, and Grit rules own source relationships. This repository currently
admits no script-backed Habitat rule. A future native capability gap requires a
named authority decision before the packet topology can change. Behavioral
semantics stay in TypeScript tests and owner review rather than being
approximated as source shape.

The Habitat-owned `@habitat-ai/cli` release resolves rule applications into one
cacheable focused target per rule application or compatibility rule plus one
cacheable owner-local `check:policy` command. The owner command evaluates the
same admitted applications in one Habitat invocation; focused targets remain
direct entrypoints rather than a second scheduler graph.
Each selected Grit program executes in its own native process so timeout,
failure, cancellation, and cleanup remain program-local.
The workspace consumes that released Nx plugin while retaining the source
projects as product owners. Codex Stop invokes `habitat hook agent-stop`
through the same package and catalog; it does not become a second rule-selection
path.

Repository hook contributions are a deferred Habitat realization capability.
Their declarative source may live under `.habitat`, but the Habitat Nx plugin
must realize it into ordinary consumer-owned Husky event files. Husky remains
the sole Git event adapter; Habitat must not add a parallel dispatcher, symlink
contract, or hidden hook state. The current `.husky` files therefore remain the
executable consumer boundary until that capability is specified and released.

Magic Migration remains the exercised product reference for service, API,
middleware, and store variance. Habitat assessed its clean implementation at
`5c725694e29545126cc9bb7615884741fe8e0da4` and admitted only generic semantics:
the downward context funnel, shallow nested-lane replacement, least-context
middleware authorship, and public-client service edges. Habitat owns the final
generic law; no continuing byte identity or product-local path is implied.

Required module `contract/` and `router/` directories have distinct faces.
`contract/` exposes `index.ts` plus semantic leaves. `router/` contains named
`<name>.ts` operation-authoring leaves without a barrel; the module-root
`router.ts` composes them as the module's sole router face. Optional module
`middleware/` exposes `index.ts` plus semantic leaves. Service-root middleware
is flat because `impl.ts` is its sole assembly owner. The closed model ontology
is `dto`, `entities`, `errors`, `policy`, and `ports`; TypeBox owns canonical
schemas and generated types, while database schema remains physical mapping.

`service@1` and `service@2` own the same optional database interior because
persistence authority belongs to the service and the current instance protocol
selects one kind. The positive subtree is closed to migrations, optional
physical schema, and stores;
absence is the only alternative shape. Stores privately realize persistence
and enter modules through inherited context. Modules do not acquire database
implementations, providers, or sibling service interiors. A later capability
composition protocol may factor this facet without changing that ownership.

The `resource` and `provider` boundary packets derive from Magic Migration
commit `e58cbebbee0755faf644aa36c0bd2d2527b79ee5`. Habitat retains the same closed
contract/realization split and adds its existing workspace package manifest and
build TypeScript faces to the resource shell. From Magic commit
`8f40bdff34dde18680352a9b91ce7b953c385942`, only the provider-neutral
resource Effect failure semantics enter both resource versions as one
package-native Grit pattern. `resource@1` preserves whole-project acquisition;
`resource@2` narrows it to `contract.ts` and `providers/**/*.ts`. The
predecessor compatibility-rule v2 manifest, baseline, and consumer paths remain
outside both shared definitions.
Magic's API, workflow, app, Nx, and tool overlays remain outside this package
release. Their exercised variance informs later generic Habitat kinds; the
product instances, adapters, policy, and qualified overlay rules remain local.

The Nx workspace packets are Habitat-authored. They apply the same positive,
closed-kind posture to the repository scheduler and script topology without
claiming Magic Migration provenance. No Oclif app or command-topic law is
currently active.

See [[AUTHORITY|the authority boundary]] and [[AGENTS|the repository router]].
