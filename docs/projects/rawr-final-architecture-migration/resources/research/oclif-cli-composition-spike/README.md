# OCLIF CLI Composition Spike

Date: 2026-04-20

## Verdict

RAWR is already using real OCLIF plugin mechanics in important places, but the target architecture is not yet precise enough about how CLI command plugins compose natively.

Current alignment:

- `@rawr/cli` is an OCLIF CLI and lists core OCLIF plugins plus `@rawr/plugin-plugins` in `package.json#oclif.plugins`.
- Workspace packages under `plugins/cli/*` are OCLIF-shaped packages when they expose `package.json#oclif.commands`.
- Local command-plugin development already routes through OCLIF's plugin manager via `rawr plugins link` / `plugins cli install all`.

Current gap:

- The final architecture names `plugins/cli/commands/*`, `defineCliCommandPlugin`, `rawr.hq.ts` `roles.cli.commands`, and `CliSurfaceRuntime`, but current implementation still uses `plugins/cli/*`, `rawr.kind: "toolkit"`, a dev link/install helper, and hand-authored OCLIF package wiring.
- The native OCLIF plugin manager is currently the real runtime mount mechanism for command plugins, while the final manifest model describes a CLI command registry without specifying how that registry becomes OCLIF plugin configuration.

The proposed direction is to make app-selected CLI command plugins compile into native OCLIF plugin membership. RAWR should own selection, resource binding, and service-client provisioning. OCLIF should own command discovery, dispatch, help, hooks, installed/user/dev/core plugin precedence, and plugin install/link mechanics.

## Packet

Read in this order:

1. `00-grounding-map.md` - repo/worktree state and evidence trail.
2. `01-oclif-native-capabilities.md` - external OCLIF capability model.
3. `02-current-rawr-cli-state.md` - current repo implementation.
4. `03-runtime-binding-fit-gap.md` - comparison against canonical runtime architecture.
5. `04-synthesis.md` - direct answer and recommendation.
6. `proposed-oclif-cli-composition-spec.md` - proposed architecture document.

## Source Map

Official OCLIF sources:

- [OCLIF plugins](https://oclif.io/docs/plugins/)
- [OCLIF command discovery strategies](https://oclif.io/docs/command_discovery_strategies/)
- [OCLIF plugin loading](https://oclif.io/docs/plugin_loading/)
- [OCLIF hooks](https://oclif.io/docs/hooks/)
- [OCLIF CLI configuration](https://oclif.io/docs/configuring_your_cli/)
- [OCLIF JIT plugins](https://oclif.io/docs/jit_plugins/)
- [`@oclif/plugin-plugins`](https://github.com/oclif/plugin-plugins)
- [`oclif/core`](https://github.com/oclif/core)

Repo sources:

- `apps/cli/package.json`
- `apps/cli/src/index.ts`
- `apps/hq/rawr.hq.ts`
- `plugins/AGENTS.md`
- `plugins/cli/*/package.json`
- `plugins/cli/plugins/src/commands/plugins/cli/install/all.ts`
- `plugins/cli/plugins/src/lib/plugin-install-service.ts`
- `services/hq-ops/src/service/shared/repositories/workspace-plugin-catalog-repository.ts`
- `packages/hq-sdk/src/plugins.ts`
- `docs/SYSTEM.md`
- `docs/system/PLUGINS.md`
- `docs/process/AGENT_LOOPS.md`
- `docs/process/runbooks/PLUGIN_BUILD_AND_WIRING_MATRIX.md`
- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_and_Runtime_Spec_Integrated_Final.md`
- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Subsystem_Canonical_Spec.md`

## Important Ergonomics Call

Local CLI plugin development should become first-class. The intended CLI should pick up a local command plugin either automatically from app composition in dev mode or through one native convergence command. Published or cloned install remains important, but secondary to making local composition smooth.

The historic `toolkit` name appears to carry real intent for agent-runtime plugin packaging, especially Claude Code/Codex-style plugin artifacts with skills/workflows. That should survive as a distribution/projection facet, not remain the only architectural classification for native OCLIF command plugins.
