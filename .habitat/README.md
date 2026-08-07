# Habitat Authority

This repository's `.habitat/blueprints/**` tree is the canonical authoring
source copied into the selected Habitat policy-pack artifact. Repository-owned
overlays and `habitat.toml` selections are local policy input; they do not
become a second reusable blueprint authority.
[[AUTHORITY-ONTOLOGY|Habitat's authority ontology]] distinguishes kinds,
instances, capabilities, governed communities, and resolved execution. The
SDK build copies its admitted reusable definitions and runner assets into the
selected policy pack; repositories retain authority for their own instances
and overlays. The evaluator realizes the documented blueprint/instance slice
but cannot amend these packets. Publication and consumer initialization remain
separate release checkpoints.

```text
.habitat/blueprints/<kind>/<rule>/
.habitat/rawr/<niche>/rules/<rule>/
.habitat/staged/blueprints/<kind>/<rule>/
```

The current generic kinds are:

- `package`: one closed product-free support shell whose test members are
  declared by the owning instance.
- `resource`: one closed provider-neutral capability contract and its nested
  provider-family boundary.
- `provider`: one closed typed realization nested beneath its parent resource,
  with a single public implementation index.
- `blueprint-packet`: the closed canonical policy packet shared by every
  generic blueprint rule.
- `service`: the reusable contract-first oRPC capability funnel, with one
  public client and a closed private service, module, router, model, and proof
  topology.
- `database`: the optional closed persistence interior at a standalone service
  root, limited to migrations, schema, and stores whose capabilities enter
  modules only through named root middleware and inherited context. Its own
  closed placement scopes exclude module and embedded API ownership.
- `plugin`: one closed generic projection project shell. Narrower plugin kinds
  own their role-specific source and test layout.
- `plugin-nx`: the independent closed Nx projection kind whose public index
  projects resolved rule applications into scheduler facts.
- `app`: one closed product-composition shell. Narrower app kinds own their
  host-specific runtime and entrypoint faces.
- `plugin-server-api`: the additional `client.ts` and `api.ts` surfaces that
  expose client bindings and API operations around an embedded service.
- `agent-router`: the positive source shape and routing anchors inside each
  local `AGENTS.md`.
- `oclif-app`: one executable Oclif package, binary/source entrypoints,
  discovery configuration, and generated command-manifest relationship.
- `oclif-command-plugin`: one host-composed command package, command root,
  discovery configuration, and public dependency boundary.
- `nx-workspace`: the exact root scheduler surface, including one workspace
  lint owner and one multi-project build/check/test graph.
- `plugin-server`: a documented ontology node whose current corpus proves no
  additional universal structure beyond `plugin`.

The SDK protocol-1 policy pack admits exactly six version-1 definitions, sorted as
`app`, `package`, `plugin`, `plugin-nx`, `provider`, and `resource`.
Each member resolves its definition and runner assets from the selected
package with policy-pack provenance. A repository activates one only through
its own `habitat.toml` instance; an exact producer-source copy is inert, and a
different definition at the same identity fails resolution. The remaining
repository compatibility rules continue to execute beside resolved package
rule applications. The path-qualified service compatibility packets remain
live until the portable `service@1` source rules, native Nx generator, pack
selection, and packed-consumer construction proof replace them atomically. The
`service@1` definition remains an unselected candidate until that cut lands.
Each selected definition exposes only
its required `project` anchor; source-specific scopes use blueprint-owned
`src/**` paths below that root, so repository manifests cannot redirect source
independently.
Nested-member closure and workspace-wide foreign-consumer acquisition remain
Habitat-owned constructibility requirements.

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

Every v2 `rule.json` under `.habitat/blueprints/**` is affirmed and enforced. An
intentionally unfinished law lives under `.habitat/staged/blueprints/**` with
a `staged-rule.json` candidate manifest. It enters the required check set only when
a burn-down branch moves it into the active blueprint and enforces it.

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
cacheable owner-local `check:policy` command. The owner command executes one
native owner-selected Habitat check without scheduling the focused leaves;
each selected Grit program executes in its own native process so timeout,
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

Bare `service@1` admits no `db` interior. The independent database kind owns
that service-root subtree only when Habitat can select the composition as one
closed shape. Until then, database-bearing services remain under the live
predecessor database law rather than weakening the portable service candidate.
Stores privately realize persistence and enter modules through inherited
context; modules do not acquire database implementations, providers, or sibling
service interiors.

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
