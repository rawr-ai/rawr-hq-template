# Habitat 0.5.5 Consumer Handoff

## Authority

Habitat CLI and SDK `0.5.5` are the released repository-substrate pair. Tag
`habitat-cli-v0.5.5` points to
`9e0abc792e8a9bcb564c5f48625fa65a8e964e0d`; the release record closed on
Habitat main at `dfecba06b52b44a489e5e20d330b8a21bf4eea3e`.

This handoff closes only the Bun/Nx repository preset described by [[design]].
It does not close `service@1`, the runtime-provisioning boundary, telemetry,
Rawr's task 2.8 product interface, or any provider and Marketplace settlement.

## Rawr Acceptance

Rawr consumed the release through native Nx and removed its temporary generic
scheduler and toolchain wiring. The accepted sequence is:

```sh
bunx nx migrate @habitat-ai/cli@0.5.5 --interactive=false
bun install
bunx nx generate @habitat-ai/cli:preset --packageManager=bun --no-interactive
bunx nx generate @habitat-ai/cli:init --no-interactive
```

The preset adoption landed on Rawr main at
`bb80cd078c223a37101f87a64db070e8b1be00d2` through PR #55. Its canonical
settlement record landed at `32762c3f44c15b403d3c445ba9322a77511ba476`
with tree `60c3d491fda577984317cd4b69bf4abfceab00e1` through PR #56.

Fresh Bun installation, repeated preset and initializer dry runs, strict Rawr
OpenSpec validation, resolved Nx projects, root-target exclusion, and the real
Biome-backed repository check passed. The tracked tree contains no alternate
package-manager artifact, copied `.habitat` law, custom installer, or Git package
relationship.

## Native Consumer Actions

An existing Habitat Nx consumer upgrades with:

```sh
bunx nx migrate @habitat-ai/cli@0.5.5 --interactive=false
bun install
```

It runs the `preset` and post-Git `init` generators only when adopting the
portable repository spine. A fresh repository uses the two-stage flow already
published by `@habitat-ai/cli`: `create-nx-workspace` with the Habitat preset,
then `@habitat-ai/cli:init` after Git exists. Consumers must not copy blueprints
or generic scheduler files. `nx add` remains the first-install surface, not an
upgrade command.

| Consumer | 0.5.5 action | Remaining boundary |
| --- | --- | --- |
| Rawr | Complete | Product-source admission still waits for Habitat task 2.8 |
| Civ7 | Run native `nx migrate` at its clean boundary | `service@1` remains a separate construction gate |
| Magic Migration | Run native `nx migrate` | Qualified product overlays remain consumer-owned |
| Marketplace | Run one owner-controlled native migration | No provider or skill release is implied |
| Research service | No package command while it remains Habitat source | Restack only after its separate service/runtime prerequisites land |
| Inngest and oRPC skill lanes | No command in evidence vaults | Their Marketplace host shares Marketplace's single migration |

This record completes [[tasks#3. Review, Land, Release, And Adopt|task 3.4]].
