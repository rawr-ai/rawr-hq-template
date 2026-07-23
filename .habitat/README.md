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
- `service`: the reusable contract-first oRPC service spine, contract and error
  authority, context flow, and module composition.
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
package laws. Its remaining lifecycle rule closes the curated command channel
while that implementation is simplified. Generic service, Oclif, package,
TypeScript, and Nx contracts own reusable dependency relationships; the
lifecycle niche does not duplicate those laws as a package-name or path
blacklist.

Each enforced rule has a stable `rule.json` plus a locked `baseline.json`
beside its `structure.toml` or Grit pattern. Structure rules own filesystem
topology. Every Grit packet exposes its executable source as `pattern.md`;
rule-specific semantics belong in the packet directory and rule metadata, not
in a second filename convention. Grit rules own source relationships.
Behavioral semantics stay in TypeScript tests and owner review rather than
being approximated as source shape.

`@rawr/habitat-consumer:check:packets` evaluates the packet topology through the
pinned standalone binary. The published binary does not expose a native fixture
runner for these Habitat packet sources, so the repository does not add a second
Markdown parser or duplicate pattern inventory to simulate one.

The `service`, `plugin-server-api`, `agent-router`, `plugin`, and
`plugin-server` packets follow Magic Migration commit
`5a974f0047f0667c2e429fdb4193a0e237b067c4`. RAWR preserves the current
structure and Grit semantics while adapting only repository identity metadata
and the canonical `pattern.md` packet filename required by the local
`blueprint-packet` law.

The Oclif packets are RAWR-authored. They apply the same positive, closed-kind
posture to the executable app and its command plugins without claiming Magic
Migration provenance.

See [[AUTHORITY|the authority boundary]] and [[AGENTS|the repository router]].
