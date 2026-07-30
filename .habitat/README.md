# RAWR Habitat Authority

This tree is RAWR HQ-Template's repository-local structural authority. The
installed `@habitat/cli` package evaluates these packets without amending them.

```text
.habitat/blueprints/<kind>/<rule>/
.habitat/rawr/<niche>/rules/<rule>/
.habitat/staged/blueprints/<kind>/<rule>/
```

The current generic kinds are:

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
- `resource`: one closed RAWR workspace package around a provider-neutral
  capability contract and its provider family.
- `provider`: one closed typed realization nested beneath its parent resource,
  with a single public implementation index.
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
- `plugin` and `plugin-server`: documented parent kinds whose universal shape
  remains intentionally unconstrained.

The `rawr/` tree carries owner-qualified constraints that are not generic
package laws. Its repository niche owns the cross-kind `AGENTS.md` placement
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

Every rule under `.habitat/blueprints/**` is affirmed and enforced. An
intentionally unfinished law lives under `.habitat/staged/blueprints/**` with
a `staged-rule.json` candidate manifest. It enters the required graph only when
a burn-down branch moves it into the active blueprint and enforces it.

Each enforced rule has a stable `rule.json` plus a locked `baseline.json`
beside its `structure.toml` or Grit pattern. Structure rules own filesystem
topology. Every Grit packet exposes its executable source as `pattern.md`;
rule-specific semantics belong in the packet directory and rule metadata, not
in a second filename convention. Grit rules own source relationships. Template
currently admits no script-backed Habitat rule. A future native capability gap
requires a named authority decision before the packet topology can change.
Behavioral semantics stay in TypeScript tests and owner review rather than
being approximated as source shape.

The installed Habitat Nx plugin discovers the registry and infers one cacheable
target per rule plus owner-local `check:policy` composition. Codex Stop invokes
`habitat hook agent-stop`; it shares the package and registry but does not
become a second admission graph.

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
The port keeps Magic's source patterns byte-identical. Rule manifests adapt
their niche (`magic` to `rawr`) and repository formatting; the strengthened
consumer-sealing law is advisory while its shared owner-local relative-path
case is corrected. Template otherwise adds only package metadata, module
`AGENTS.md`, and API paths. RAWR adds one generic model distinction: optional
closed `entities` directories own stable domain identity that survives
attribute changes and participates in transitions. Persistence alone is
insufficient. TypeBox owns canonical entity schemas and generated types; DTOs
remain operation or boundary projections, while database schema remains
physical mapping. Stores privately realize persistence and may map records
into entities when the domain models continuing identity. There is no database
DTO category, and entity declarations do not import those downstream owners.
That structural destination remains advisory until the shared TypeBox and
platform-neutral source laws cover entities; no production entity source moves
before that shared law lands.

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
