# Workstream Plugin Pack Router

## Purpose

- Supply reusable, provider-neutral coordination assets for opening, running,
  reviewing, and closing bounded engineering workstreams.

## Scope

- Applies to the generic workstream assets and local activation tooling in
  `tools/workstream-plugin-pack/**`.

## Boundaries

- Owns reusable workstream skills, role briefs, record and packet assets, and
  the bounded hooks that support those materials.
- The installer is a Template-local projection helper. It may write only its
  closed workstream-skill and workstream-agent allowlist and must continue to
  reject aliases and destinations outside this checkout.
- Generated workstream activation files are not source assets and must not be
  checked in. The repository-owned `.codex/hooks.json` composes these canonical
  hook sources directly and is outside installer ownership.
- The owner-qualified Habitat niche closes the pack's stable asset roots and
  requires checked-in SessionStart and Stop configuration to target the
  canonical hook sources. Hook runtime code retains only operational behavior;
  it does not re-evaluate that structural policy.
- This pack is not a curated-content plugin, a program authority, or the owner
  of Runtime Realization Lab evidence and gates.

## Behavior

- Authors maintain generic workstream primitives, local installers project
  them only into approved activation paths, and domain overlays specialize the
  primitives without rewriting their source.

## Concepts

- A **workstream asset** is a reusable skill, role brief, packet, hook, or
  record template. **Activation** is a checkout-local projection; an
  **overlay** adds domain rules while preserving the generic primitive.

## Flow

- Authors maintain provider-neutral source assets and hooks in this pack.
- The local installer can preview or project workstream skills and agent briefs
  into this checkout's activation homes. Repository hook composition invokes
  the pack's hook sources without another copy.
- Runtime-specific workstream rules specialize the generic pack through
  explicit overlays rather than changing its primitive.

## Interfaces

- Source assets face plugin authors; the dry-run and installer face local
  activation homes; repository policy and runtime-lab overlays are external
  consumers rather than authority owned by this pack.

## Routing

- [Repository router](../../AGENTS.md)
- [Pack overview](README.md)
- [Repository workstream policy](../../docs/process/WORKSTREAMS.md)
- [Runtime Realization Lab router](../runtime-realization-type-env/AGENTS.md)

## Validation

- `bun tools/workstream-plugin-pack/scripts/install-local-codex-pack.ts --dry-run`
- `bun run habitat -- --rule require_workstream_plugin_pack_topology`
- `bun run habitat -- --rule require_workstream_plugin_pack_hook_configuration`
- `bunx nx run workstream-plugin-pack:test`
- `bunx nx run workstream-plugin-pack:check`
