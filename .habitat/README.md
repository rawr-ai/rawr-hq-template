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
  module isolation, owner-private aliases, platform-neutral boundary
  declarations, declarative TypeBox contracts, and public error authority.
- `plugin-server-api`: the additional `client.ts` and `api.ts` faces that
  expose client bindings and API operations around an embedded service.
- `agent-router`: local `AGENTS.md` placement and positive routing anchors.
- `oclif-app`: one executable Oclif package, binary/source entrypoints,
  discovery configuration, and generated command-manifest relationship.
- `oclif-command-plugin`: one host-composed command package, command root,
  discovery configuration, and public dependency boundary.
- `plugin` and `plugin-server`: documented parent kinds whose universal shape
  remains intentionally unconstrained.

The `rawr/` tree carries owner-qualified constraints that are not generic
package laws. Its remaining lifecycle rule closes the curated command channel
while that implementation is simplified. Generic service and Oclif packets own
their admitted source relationships, and TypeScript package exports own public
compatibility. The lifecycle niche does not duplicate those laws as a
package-name or path blacklist. A future resolved project-edge constraint is a
separate Habitat graph packet, not an ESLint rule.

Each enforced rule has a stable `rule.json` plus a locked `baseline.json`
beside its `structure.toml` or Grit pattern. Structure rules own filesystem
topology. Every Grit packet exposes its executable source as `pattern.md`;
rule-specific semantics belong in the packet directory and rule metadata, not
in a second filename convention. Grit rules own source relationships.
Behavioral semantics stay in TypeScript tests and owner review rather than
being approximated as source shape.

`habitat:check:policy` evaluates the admitted policy batch through one
invocation of the pinned standalone binary. The published binary does not
expose a native fixture runner for these Habitat packet sources, so the
repository does not add a second Markdown parser or duplicate pattern inventory
to simulate one.

The `plugin-server-api`, `agent-router`, `plugin`, and `plugin-server` packets
follow Magic Migration commit
`5a974f0047f0667c2e429fdb4193a0e237b067c4`. The `service` packet stack follows
Magic Migration commit `543e78eddd00ef6cfccfdf3ae366143b6034f012`,
service-blueprint tree `2a9160183b80badacedbb6006b95829bd166470a`,
as its foundation. Its anchor, contract, and oRPC composition laws follow the
corrections at Magic Migration commit
`32edafcbdcd84132da2e6eb8844ce9d0530ddcce`, service-blueprint tree
`89446f8be81b1f417aa4f292034a20851c796561`. RAWR preserves the shared topology
and six shared source-law algorithms. Its adaptations retain local packet
ownership and the canonical `@rawr/hq-sdk` TypeBox Standard Schema bridge name.
RAWR adds two owner-private alias laws and one platform-independence law for
contracts, schemas, and DTOs; those local packets do not change the imported
Magic service algorithms.

The Oclif packets are RAWR-authored. They apply the same positive, closed-kind
posture to the executable app and its command plugins without claiming Magic
Migration provenance.

See [[AUTHORITY|the authority boundary]] and [[AGENTS|the repository router]].
