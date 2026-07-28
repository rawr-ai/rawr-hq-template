# RAWR Habitat Authority

This tree is RAWR HQ-Template's repository-local structural authority. The
pinned standalone Habitat binary evaluates these packets without amending
them.

```text
.habitat/blueprints/<kind>/<rule>/
.habitat/rawr/<niche>/rules/<rule>/
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
- `nx-workspace`: the exact root scheduler surface and resolved project-quality
  admission, including one workspace lint owner and one multi-project
  build/check/test graph.
- `typescript-source`: TypeScript-resolved JavaScript and TypeScript
  owner-consumer relations that require exact project module resolution rather
  than filename approximation.
- `plugin` and `plugin-server`: documented parent kinds whose universal shape
  remains intentionally unconstrained.

The `rawr/` tree carries owner-qualified constraints that are not generic
package laws. Its repository niche owns the cross-kind `AGENTS.md` placement
relation without acquiring the topology of the heterogeneous package and
module roots it inspects. Its remaining lifecycle rule closes the curated
command channel while that implementation is simplified. Generic service and
Oclif packets own their admitted source relationships, and TypeScript package
exports own public compatibility. Neither niche duplicates those laws as a
package-name or path blacklist. Resolved project admission is a separate
Habitat rule, not an ESLint rule.

Each enforced rule has a stable `rule.json` plus a locked `baseline.json`
beside its `structure.toml` or Grit pattern. Structure rules own filesystem
topology. Every Grit packet exposes its executable source as `pattern.md`;
rule-specific semantics belong in the packet directory and rule metadata, not
in a second filename convention. Grit rules own source relationships. A
`check.mjs` is the closed exception for a demonstrated native runner gap and
must remain inside its rule packet. Behavioral semantics stay in TypeScript
tests and owner review rather than being approximated as source shape.

`habitat:check:policy` composes the pinned-binary 22-rule local policy batch at
`habitat:check:policy:local` with the one rule-owned Nx graph adapter. The
independent `habitat:check:structure` leaf selects exactly nine Habitat
structure rules for Stop feedback and is not a policy dependency. Both CLI
leaves are intentionally uncached: their rule scopes are exact, while exact Nx
cache inputs remain owned by the future upstream distributable Habitat Nx
boundary. The published binary exposes neither its native Nx runner nor a
packet-fixture runner, so the repository does not add a second Markdown parser
or duplicate pattern inventory to simulate either one.
The TypeScript source adapter is exposed separately as the cacheable
`habitat:check:documentation` target. It remains a red manual target until the
existing corpus is documented; activation is then one dependency edge into
`check:policy`, not a baseline or second policy surface.

The `plugin-server-api`, `agent-router`, `plugin`, and `plugin-server` packets
follow Magic Migration commit
`5a974f0047f0667c2e429fdb4193a0e237b067c4`. The current `service` and
`database` packets follow the stable Magic authority at commit
`2374baa937466fe794e424c700fdd9d8ac7d64cd`, service tree
`53cd340b859e660ad6a0cc1619b283edfb025e13`, and database tree
`8ec14dbad5244f0725978e31b7e3c53f54b0bdbb`. The same trees remain unchanged
through reviewed Magic head `01ea4c3ac534dc624bd7f769fc6eee994a38752a`.
The imported agent-router placement relation retains that provenance but now
lives under `rawr/repository`: it relates repository-owned roots and is not a
constructible document-kind topology.
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

Required module `contract/` and `router/` directories expose `index.ts` plus
semantic leaves; optional `middleware/` uses the same entrypoint shape. Root
contract and router files remain the service composition spines. The former
flat module faces and the duplicate private-alias packets are superseded rather
than preserved as compatibility rules.

The database topology requires closed `migrations/*.sql` and `stores/*.ts`
interiors when `db` is present and admits optional closed `schema/*.ts` only
for technology-specific physical mappings. Database-owned source and direct
named root middleware may import database leaves; modules consume projected
stores through inherited context. The service and database migration packets
remain advisory with empty baselines, so current violations stay visible until
the production burn-down reaches this destination.

The `resource` and `provider` boundary packets derive from Magic Migration
commit `e58cbebbee0755faf644aa36c0bd2d2527b79ee5`. RAWR retains the same closed
contract/realization split and adds its existing workspace package manifest and
build TypeScript faces to the resource shell.

The Oclif and Nx workspace packets are RAWR-authored. They apply the same
positive, closed-kind posture to the executable app, its command plugins, and
the repository scheduler without claiming Magic Migration provenance.

See [[AUTHORITY|the authority boundary]] and [[AGENTS|the repository router]].
