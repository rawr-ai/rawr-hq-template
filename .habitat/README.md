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
component. The SDK build copies the complete recursive definition and runner
assets into the selected policy pack; packaging does not flatten or reinterpret
them.
Repositories retain authority for their own instances and overlays.

```text
.habitat/blueprints/<kind>/blueprint.toml
.habitat/blueprints/<kind>/structure.toml
.habitat/blueprints/<kind>/components/<role>/<rule>.md
.habitat/rawr/<niche>/rules/<rule>/
.habitat/staged/blueprints/<kind>/<rule>/
```

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

The accepted SDK protocol-1 policy pack admits exactly seven version-1
definitions, sorted as `app`, `package`, `plugin`, `plugin-nx`, `provider`,
`resource`, and `service`.
Each member resolves its definition and runner assets from the selected
package with policy-pack provenance. A repository activates one only through
its own `habitat.toml` instance; an exact producer-source copy is inert, and a
different definition at the same identity fails resolution. The remaining
repository compatibility rules continue to execute beside resolved package
rule applications. The selected `service` definition co-lands its focused
positive law, native Nx generator, recursive package closure, and
packed-consumer construction proof.
Each selected definition exposes only
its required `project` anchor; source-specific scopes use blueprint-owned
`src/**` paths below that root, so repository manifests cannot redirect source
independently.
Nested-member closure remains Habitat-owned. The closed package export law and
Nx's `@nx/enforce-module-boundaries` rule own workspace-wide foreign-consumer
direction.

The `rawr/` tree carries owner-qualified constraints that are not generic
package laws. It is the current physical overlay for repository governance,
not the complete definition of a Habitat niche. Its repository niche owns the
cross-kind `AGENTS.md` placement
relation without acquiring the topology of the heterogeneous package and
module roots it inspects, plus the positively closed root for repository
scripts and the exported-value documentation contract on the admitted public
lifecycle boundary. Its Runtime Realization lab niche owns that tool's closed
container axes and parser-visible plane containment. Its workstream-plugin-pack
niche closes that tool's asset roots and requires checked-in SessionStart and
Stop configuration to invoke the canonical hook sources. Its agent-plugin
lifecycle niche closes the curated command channel and keeps curated command
source independent from the native external-plugin package. Its web-host niche
admits public environment fields only through the web-owned projection funnel.
The service structure and Oclif packets own their admitted relationships, and
TypeScript package exports own public compatibility. These qualified niches do
not duplicate generic laws as package-name or path blacklists.

Remaining v2 `rule.json` packets outside a selected kind are repository
compatibility law, not reusable kind authority. An intentionally unfinished
law lives under `.habitat/staged/blueprints/**` with a `staged-rule.json`
candidate manifest and has no enforcement authority until it is completed,
selected, and moved into its owning definition.

Each enforced v2 compatibility rule has a stable `rule.json` plus a locked `baseline.json`
beside its `structure.toml` or Grit pattern. Structure rules own filesystem
topology. Every Grit packet exposes its executable source as `pattern.md`;
rule-specific semantics belong in the packet directory and rule metadata, not
in a second filename convention. Grit rules own source relationships. This repository
currently admits no script-backed Habitat rule. A future native capability gap
requires a named authority decision before the packet topology can change.
Behavioral semantics stay in TypeScript tests and owner review rather than
being approximated as source shape.

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

`service@1` owns its optional database interior because persistence authority
belongs to the service and the current instance protocol selects one kind. Its
positive subtree is closed to migrations, optional physical schema, and stores;
absence is the only alternative shape. Stores privately realize persistence
and enter modules through inherited context. Modules do not acquire database
implementations, providers, or sibling service interiors. A later capability
composition protocol may factor this facet without changing that ownership.

The `resource` and `provider` boundary packets derive from Magic Migration
commit `e58cbebbee0755faf644aa36c0bd2d2527b79ee5`. Habitat retains the same closed
contract/realization split and adds its existing workspace package manifest and
build TypeScript faces to the resource shell. From Magic commit
`8f40bdff34dde18680352a9b91ce7b953c385942`, only the provider-neutral
resource Effect failure semantics enter `resource@1`, as one package-native
Grit pattern acquired from the instance project root. The predecessor v2
manifest, baseline, and consumer paths remain outside the shared definition.
Magic's API, workflow, app, Nx, and tool overlays remain outside this package
release. Their exercised variance informs later generic Habitat kinds; the
product instances, adapters, policy, and qualified overlay rules remain local.

The Oclif and Nx workspace packets are Habitat-authored. They apply the same
positive, closed-kind posture to the executable app, its command plugins, and
the repository scheduler without claiming Magic Migration provenance.

See [[AUTHORITY|the authority boundary]] and [[AGENTS|the repository router]].
