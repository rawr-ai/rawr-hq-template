# RAWR Habitat Authority

This tree is RAWR HQ-Template's repository-local structural authority. The
pinned standalone Habitat binary evaluates these packets without amending
them.

```text
.habitat/blueprints/<kind>/<rule>/
.habitat/rawr/<niche>/rules/<rule>/
```

The current generic kinds are:

- `service`: the reusable contract-first oRPC service spine, contract and error
  authority, context flow, module composition, and optional closed router
  interior.
- `plugin-server-api`: the additional client/server faces around an embedded
  service.
- `agent-router`: local `AGENTS.md` placement and positive routing anchors.
- `oclif-app`: one executable Oclif package, binary/source entrypoints,
  discovery configuration, and generated command-manifest relationship.
- `oclif-command-plugin`: one host-composed command package, command root,
  discovery configuration, and public dependency boundary.
- `plugin` and `plugin-server`: documented parent kinds whose universal shape
  remains intentionally unconstrained.

The `rawr/` tree carries owner-qualified constraints that are not generic
package laws. Its current lifecycle rules preserve the curated command channel
and service-to-resource dependency direction while that implementation is
simplified. They remain governed by `@rawr/agent-plugin-lifecycle`; the generic
blueprint owner does not absorb them.

Each enforced rule has a stable `rule.json` plus a locked `baseline.json`
beside its `structure.toml` or Grit pattern. Structure rules own filesystem
topology. Every Grit packet exposes its executable source as `pattern.md`;
rule-specific semantics belong in the packet directory and rule metadata, not
in a second filename convention. Grit rules own source relationships.
Behavioral semantics stay in TypeScript tests and owner review rather than
being approximated as source shape.

The `service`, `plugin-server-api`, `agent-router`, `plugin`, and
`plugin-server` packets originate from Magic Migration commit
`31c4e1ac1944d88b5ae867e46603eddff36142fc`. RAWR changes only repository
identity metadata and the settled module-router geometry: `router.ts` remains
the module boundary, while an optional closed `router/` exports one plain map
from `index.ts` and admits only `*.router.ts` leaves. The pinned Grit engine
validates any authored `./router/index` import and use but cannot prove a
non-emitting cross-file absence relation. Complete optional-interior
participation therefore remains review evidence and an explicit tool gap until
Habitat can express that relation.

The Oclif packets are RAWR-authored. They apply the same positive, closed-kind
posture to the executable app and its command plugins without claiming Magic
Migration provenance.

See [[AUTHORITY|the authority boundary]] and [[AGENTS|the repository router]].
