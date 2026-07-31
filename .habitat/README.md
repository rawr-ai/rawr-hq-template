# RAWR Habitat Authority

This tree is RAWR HQ-Template's repository-local structural authority.
[[AUTHORITY-ONTOLOGY|Habitat's authority ontology]] distinguishes kinds,
instances, capabilities, governed communities, and resolved execution. The
current evaluator realizes only the documented blueprint/instance slice and
cannot amend these packets. Publication and consumer initialization remain
separate release checkpoints.

```text
.habitat/blueprints/<kind>/<rule>/
.habitat/rawr/<niche>/rules/<rule>/
.habitat/staged/blueprints/<kind>/<rule>/
```

The current generic kinds are:

- `package`: one closed product-free support shell whose proof members are
  declared by the owning instance.
- `resource`: one closed provider-neutral capability contract and its nested
  provider-family boundary.
- `provider`: one closed typed realization nested beneath its parent resource,
  with a single public implementation index.
- `blueprint-packet`: the closed canonical policy packet shared by every
  generic blueprint rule.
- `service`: the reusable contract-first oRPC service spine, with independent
  laws for generic anchors, native oRPC composition, context boundaries,
  module isolation, operation authorship, standalone production source
  isolation from proof, public-consumer sealing, platform-independent service
  implementation, declarative TypeBox contracts, and typed failure authority.
- `database`: the optional closed persistence interior at a standalone service
  root, limited to migrations, schema, and stores whose capabilities enter
  modules only through named root middleware and inherited context. Its own
  closed placement scopes exclude module and embedded API ownership.
- `plugin`: one closed generic projection project shell. Narrower plugin kinds
  own their role-specific source and proof faces.
- `plugin-nx`: the independent closed Nx projection kind whose public index
  projects resolved applications into scheduler facts.
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

The seven v3 definitions for `package`, `resource`, `provider`, `service`,
`plugin`, `plugin-nx`, and `app` currently have no instances or resolved
applications. Their blueprint-root schema-2 structures are schema-admitted but
execution-inert while the released evaluator continues to execute only the 33
registered v2 compatibility rules. The six service-construction packets remain
staged. Exact blueprint-root relations, nested-member closure, and
workspace-wide foreign-consumer acquisition remain Habitat-owned constructibility
requirements; see the active OpenSpec handoff before creating the first v3
instance.

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
Generic service and Oclif packets own their admitted source relationships, and
TypeScript package exports own public compatibility. These qualified niches do
not duplicate generic laws as package-name or path blacklists.

Every v2 `rule.json` under `.habitat/blueprints/**` is affirmed and enforced. An
intentionally unfinished law lives under `.habitat/staged/blueprints/**` with
a `staged-rule.json` candidate manifest. It enters the required graph only when
a burn-down branch moves it into the active blueprint and enforces it.

Each enforced v2 compatibility rule has a stable `rule.json` plus a locked `baseline.json`
beside its `structure.toml` or Grit pattern. Structure rules own filesystem
topology. Every Grit packet exposes its executable source as `pattern.md`;
rule-specific semantics belong in the packet directory and rule metadata, not
in a second filename convention. Grit rules own source relationships. Template
currently admits no script-backed Habitat rule. A future native capability gap
requires a named authority decision before the packet topology can change.
Behavioral semantics stay in TypeScript tests and owner review rather than
being approximated as source shape.

The Template-owned Habitat Nx source projects resolved applications into one
cacheable target per application plus owner-local `check:policy` composition.
The workspace still loads the released Civ7 checker until the Habitat app,
initializer, and successor release are sealed. Codex Stop invokes
`habitat hook agent-stop`; it shares the predecessor package and catalog but
does not become a second admission graph.

The `plugin-server-api`, `agent-router`, `plugin`, and `plugin-server` packets
follow Magic Migration commit
`5a974f0047f0667c2e429fdb4193a0e237b067c4`. The current `service` and
`database` packets follow Magic's committed capability-ratchet activation at
`2928a2c772edaced527e4cc856d1260c94105456`, service tree
`7f0df909d5196a628bf53fb2febda46549db7b42`, and database tree
`c81df2ce845af06343cf2036f1ae29e5645cba8b`. That activation follows the
reviewed service migrations through
`f620e041ea1bab9e1f41fe5467ceffb9b313dea6`.
The imported agent-router placement relation retains that provenance but now
lives under `rawr/repository`: it relates repository-owned roots and is not a
constructible document-kind topology.
The `rawr/app-host` niche keeps the HQ application-to-server dependency
directional: the declaration manifest stays cold, and only the app-owned
server entrypoint crosses through the server's public host export.
The port preserves Magic's service-law lineage rather than claiming continuing
byte identity. Template deliberately refines the module router face, package
metadata, module `AGENTS.md`, API paths, and the qualified RAWR niche; those
differences are owned and proved here instead of being described as upstream
copies. The strengthened consumer-sealing law remains advisory while its
owner-local relative-path case is corrected. RAWR also records one generic
model distinction: optional closed `entities` directories own stable domain
identity that survives attribute changes and participates in transitions.
Persistence alone is insufficient. TypeBox owns canonical entity schemas and
generated types; DTOs remain operation or boundary projections, while database
schema remains physical mapping. Stores privately realize persistence and may
map records into entities when the domain models continuing identity. There is
no database DTO category, and entity declarations do not import those
downstream owners. That structural destination remains advisory until the
shared TypeBox and platform-neutral source laws cover entities; no production
entity source moves before that shared law lands.

Required module `contract/` and `router/` directories have distinct faces.
`contract/` exposes `index.ts` plus semantic leaves. `router/` contains named
`*.router.ts` operation-authoring leaves without a barrel; the module-root
`router.ts` composes them as the module's sole router face. Optional
`middleware/` exposes `index.ts` plus semantic leaves. Service-root contract
and router files remain the service composition spines. Optional service-root
middleware instead consists of direct kebab-case leaves with no barrel; each
exports `middleware` for semantic attachment in `impl.ts`. The former module
`contract.ts`, router barrel, and duplicate private-alias packets are
superseded rather than preserved as compatibility rules.

The enforced database topology requires closed `migrations/*.sql` and `stores/*.ts`
interiors when `db` is present and admits optional closed `schema/*.ts` only
for technology-specific physical mappings. Database-owned source and direct
named root middleware leaves may import database source. Those leaves attach
through `impl.ts` without a root barrel; modules consume projected stores
through inherited context. The unfinished service spine, anchor, context,
composition, isolation, router-authorship, and public-consumer laws remain
explicit staged packets until their production burn-down reaches zero.

The `resource` and `provider` boundary packets derive from Magic Migration
commit `e58cbebbee0755faf644aa36c0bd2d2527b79ee5`. RAWR retains the same closed
contract/realization split and adds its existing workspace package manifest and
build TypeScript faces to the resource shell.

The Oclif and Nx workspace packets are RAWR-authored. They apply the same
positive, closed-kind posture to the executable app, its command plugins, and
the repository scheduler without claiming Magic Migration provenance.

See [[AUTHORITY|the authority boundary]] and [[AGENTS|the repository router]].
