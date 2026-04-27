# Runtime Binding Fit Gap

## Direct Answer

The target runtime architecture can support OCLIF-native CLI plugins, but it needs one hard clarification:

`roles.cli.commands` in `rawr.hq.ts` should select OCLIF plugin packages, and RAWR should materialize those selections into native OCLIF plugin membership for the intended CLI.

The runtime subsystem should not become a CLI command discovery or dispatch engine. OCLIF already owns that.

## Correct Integration Boundary

The boundary should be:

| Concern | Owner |
| --- | --- |
| command package format | OCLIF plugin package |
| command discovery | OCLIF |
| command dispatch and help | OCLIF |
| plugin install/link/user plugin manager | OCLIF and `@oclif/plugin-plugins` |
| app selection of command plugins | `rawr.hq.ts` |
| process resources | RAWR runtime subsystem |
| role resources and service clients | RAWR runtime subsystem via plugin binding |
| service boundary bags | `bindService(...)` / service package clients |
| Effect lifecycle | hidden `packages/runtime/*` substrate |

That split preserves the canonical stance:

```text
RAWR owns semantic meaning.
Effect owns execution mechanics.
Boundary frameworks keep their jobs.
```

For CLI, OCLIF is the boundary framework.

## What `CliSurfaceRuntime` Should Mean

`CliSurfaceRuntime` should not be an in-memory command registry competing with OCLIF.

It should be the RAWR runtime view for the selected CLI surface, containing enough information for the CLI harness/build/dev tooling to:

- identify selected CLI command plugins,
- resolve package names and local workspace paths,
- determine core/dev/user install posture,
- expose process and role runtime views to command code,
- report topology/catalog state,
- validate that selected plugins have valid OCLIF metadata and optional manifests,
- materialize or verify OCLIF plugin config for the intended CLI.

The actual command classes remain OCLIF command classes.

## Canonical Architecture Commitments

The integrated spec defines plugins as runtime projection, not services, bootgraphs, app manifests, process runtimes, or mini-frameworks. It names role-first plugin roots, including `plugins/cli/commands/*`, and names `defineCliCommandPlugin`.

Evidence:

- `RAWR_Canonical_Architecture_Spec.md:960-978`
- `RAWR_Canonical_Architecture_Spec.md:1013-1028`

The same spec says a manifest authors app identity, process modules, role membership, and explicit surface membership. Its canonical shape is `role -> surface -> plugin membership`.

Evidence:

- `RAWR_Canonical_Architecture_Spec.md:1293-1320`

The Effect runtime subsystem spec says the key binding seam is between booted resources, role-local bound service clients, and mounted surface code. It also states:

```text
plugins describe binding
runtime subsystem performs binding
services receive canonical boundary bags
```

Evidence: `RAWR_Effect_Runtime_Subsystem_Canonical_Spec.md:1064-1080`.

The started process shape includes `cli?: CliSurfaceRuntime`, and the process runtime owns surface assembly while not owning command semantics.

Evidence:

- `RAWR_Effect_Runtime_Subsystem_Canonical_Spec.md:1257-1272`
- `RAWR_Effect_Runtime_Subsystem_Canonical_Spec.md:1275-1296`

The spec also says web and CLI harnesses follow the same runtime-subsystem contract: runtime boots resources, builds surface runtime, and harness mounts/provides invocation input.

Evidence: `RAWR_Effect_Runtime_Subsystem_Canonical_Spec.md:1374-1380`.

## Binding Shape For CLI Commands

Current `packages/hq-sdk/src/plugins.ts` already provides a pre-Effect `bindService(...)` seam. It produces construction-time `{ deps, scope, config }`, leaves invocation to call time, and avoids seeding service `provided`.

Evidence: `packages/hq-sdk/src/plugins.ts:1-10`, `packages/hq-sdk/src/plugins.ts:76-113`.

That shape is compatible with CLI command plugins. A command plugin can:

- define OCLIF command classes;
- use public `@rawr/hq-sdk` helpers to bind service clients;
- derive invocation input from CLI flags, cwd, workspace root, auth/caller surface, and command context;
- call service package clients through canonical boundary APIs.

It should not:

- import `apps/cli` internals;
- import other plugin runtime code;
- import `packages/runtime/substrate`;
- construct raw Effect `Layer`, `ManagedRuntime`, `Context.Tag`, or `Effect.Service`;
- bypass service package clients.

## Current Fit

Current implementation fits the model in these ways:

- OCLIF remains the command runtime: `apps/cli/src/index.ts` calls `@oclif/core` `run`.
- OCLIF plugin packages exist under `plugins/cli/*`.
- Commands use public service clients and binding helpers rather than direct app internals in several places.
- OCLIF install/link is already kept at the OCLIF plugin-manager boundary rather than hidden inside app code.

Current implementation does not yet fit the model in these ways:

- `apps/hq/rawr.hq.ts` does not express CLI role/surface membership.
- The root CLI package statically lists plugins rather than consuming app-manifest-selected CLI plugin membership.
- `toolkit` is doing two jobs: command-plugin eligibility and agent-runtime package/toolkit distribution intent.
- `rawr plugins cli install all` is the convergence mechanism, not yet a projection of app manifest composition.

## Ergonomic Gap

The desired local developer experience is:

```text
author CLI command plugin
select it in the intended app/CLI composition
run one convergence command or dev CLI bootstrap
rawr sees the local command plugin natively through OCLIF
```

The current path is close but still catalog-driven:

```text
rawr.kind=toolkit
package has OCLIF command wiring
plugins cli install all scans toolkit packages
helper runs build and rawr plugins link
OCLIF user plugin manager loads linked plugin
```

The target should be app-composition-driven:

```text
defineCliCommandPlugin(...)
rawr.hq.ts roles.cli.commands selects plugin
runtime/compiler exports CLI surface topology
dev convergence materializes OCLIF dev/core plugin membership
OCLIF loads the command plugin
```

## `toolkit` Naming Fit

`toolkit` should not disappear blindly. It likely names a real distribution path for agent runtimes, especially packages that provide Claude Code/Codex internal plugin artifacts such as skills, workflows, and command banks.

The fit gap is that `toolkit` is not precise enough to be the only kind for OCLIF command plugins.

Target shape:

- Native OCLIF command plugin identity is explicit.
- Agent toolkit packaging is a facet or exported artifact family.
- A single package may provide both an OCLIF command plugin and an agent toolkit artifact when that is intentional.

That lets RAWR keep the intended agent-runtime path without making local CLI composition depend on historical naming.

## Public Naming Fit

The target architecture should avoid making "plugin" mean both native OCLIF command plugin and RAWR runtime capability. OCLIF already owns a real, user-facing plugin concept, including `plugins install` and `plugins link`. RAWR should not create another public "plugin" channel beside it.

If RAWR later needs enable/disable/toggle behavior for workspace capabilities, that should be modeled as HQ Ops capability or topology state. It can still be implemented by packages that participate in app composition, but the public vocabulary should not be `rawr plugins web`.
