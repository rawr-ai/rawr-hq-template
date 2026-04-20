# Grounding Map

## Repo State

Preflight was run from `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template`.

- Primary checkout: detached `HEAD` at `aff8693ce75d7f41b79f5713ec3cd4d82ace23f3`.
- Existing migration worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-plugin-plugins-service-migration`, branch `agent-ORCH-plugin-logic-service-split`, also at `aff8693ce75d7f41b79f5713ec3cd4d82ace23f3`.
- Created spike worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-oclif-cli-composition-spike-20260420`.
- Created branch: `codex/spike-oclif-cli-composition-20260420`.
- Graphite tracking: `codex/spike-oclif-cli-composition-20260420` tracked with parent `agent-ORCH-plugin-logic-service-split`.

The spike worktree had no `node_modules`, so `bunx nx ...` failed there with missing Nx modules. The same Nx commands were then run from the primary checkout, whose dependency install was already present. This matters only for command execution location; the source tree and commit were the same.

## Skills And Method

Applied:

- `deep-search`: multi-angle repo search, breadcrumbs, source map.
- `spike-methodology`: layered orient/explore/deepen structure and evidence-backed claims.
- `team-design`: four-lane investigation shape with one synthesis owner.
- `nx-workspace`: Nx-first project inventory and target discovery.

No subagents were spawned. The team design was used as a coordination structure, not as parallel delegated execution.

## Team Lanes

| Lane | Question | Output |
| --- | --- | --- |
| OCLIF lane | What does OCLIF natively provide for plugin composition? | `01-oclif-native-capabilities.md` |
| Repo lane | What does RAWR currently do? | `02-current-rawr-cli-state.md` |
| Runtime lane | How should this fit app manifest, runtime binding, and Effect substrate? | `03-runtime-binding-fit-gap.md` |
| Adversarial lane | Where can current docs/code create dual authority or bad ergonomics? | `04-synthesis.md` plus proposed spec |

## Commands Run

Preflight:

```bash
git status --short --branch
git worktree list --porcelain
gt ls
git rev-parse HEAD
```

Worktree setup:

```bash
git worktree add -b codex/spike-oclif-cli-composition-20260420 /Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-oclif-cli-composition-spike-20260420 aff8693ce75d7f41b79f5713ec3cd4d82ace23f3
gt track codex/spike-oclif-cli-composition-20260420 --parent agent-ORCH-plugin-logic-service-split --no-interactive
```

Nx/current-state checks run from the primary checkout:

```bash
bunx nx show projects
bunx nx show project @rawr/cli --json
bunx nx show project @rawr/plugin-plugins --json
bunx nx show project @rawr/plugin-hello --json
bunx nx show project @rawr/plugin-session-tools --json
bunx nx show project @rawr/plugin-chatgpt-corpus --json
```

Local OCLIF install/link dry-run was run with temporary home/data/config/cache directories:

```bash
HOME="$TMP/home" XDG_DATA_HOME="$TMP/xdg-data" RAWR_CACHE_DIR="$TMP/cache" RAWR_CONFIG_DIR="$TMP/config" RAWR_DATA_DIR="$TMP/data" bun run rawr -- plugins cli install all --json --dry-run
```

The dry-run exited successfully and planned four command plugins: `@rawr/plugin-chatgpt-corpus`, `@rawr/plugin-hello`, `@rawr/plugin-plugins`, and `@rawr/plugin-session-tools`. OCLIF emitted `MODULE_NOT_FOUND` warnings while loading existing plugin manager state, but the command still returned `ok: true`.

Targeted tests were run from the dependency-backed primary checkout because the spike worktree did not have installed Nx modules:

```bash
bunx nx run @rawr/cli:test
bunx nx run @rawr/plugin-plugins:test
bunx nx run @rawr/plugin-hello:test
bunx nx run @rawr/plugin-session-tools:test
```

Results:

- `@rawr/plugin-hello:test` passed.
- `@rawr/plugin-session-tools:test` passed.
- `@rawr/plugin-plugins:test` failed in `test/phase-a-gates.test.ts` because it expected `services/hq-ops/src/service/modules/plugin-catalog/helpers/manifest.ts`, which is absent in the current repo state.
- `@rawr/cli:test` failed in existing plugin sync/status/install tests. The recurring symptoms were missing stdout JSON, `MODULE_NOT_FOUND` warnings while OCLIF loaded plugin state, and `PLUGIN_LINK_FAILED` when `@rawr/plugin-plugins` failed its build step during the install-all flow.

Those failures were not caused by the spike packet, which is docs-only. They are useful evidence for the spike because they show the current local OCLIF link/install ergonomics are fragile.

## Breadcrumbs

- `apps/cli/package.json:22` defines the root OCLIF config, including `bin`, `commands`, `topicSeparator`, `plugins`, and `typescript.commands`.
- `apps/cli/package.json:26` lists `@oclif/plugin-help`, `@oclif/plugin-plugins`, and `@rawr/plugin-plugins` as OCLIF plugins.
- `apps/cli/src/index.ts:1` imports `run` from `@oclif/core`; `apps/cli/src/index.ts:92` calls `run(argv, import.meta.url)`.
- `plugins/cli/hello/package.json:23` declares `oclif.commands` and `oclif.typescript.commands`.
- `plugins/cli/session-tools/package.json:11` and `plugins/cli/chatgpt-corpus/package.json:6` also declare OCLIF command discovery config.
- `plugins/AGENTS.md:14` says current `plugins/cli/*` packages are CLI toolkits with `rawr.kind=toolkit`.
- `docs/system/PLUGINS.md:29` says target `rawr.kind` values should include `cli`, not `toolkit`.
- `docs/SYSTEM.md:51` says `rawr.hq.ts` is the single composition authority for runtime surfaces and exports a CLI command registry.
- `apps/hq/rawr.hq.ts:27` currently has `server` and `async` roles only, no `cli` role.
- `services/hq-ops/src/service/shared/repositories/workspace-plugin-catalog-repository.ts:15` maps discovery root `cli` to kind `toolkit`.
- `services/hq-ops/src/service/shared/repositories/workspace-plugin-catalog-repository.ts:103` makes command-plugin eligibility depend on `kind === "toolkit"` plus `package.json#oclif` command wiring.
- `plugins/cli/plugins/src/commands/plugins/cli/install/all.ts:57` defines the local helper that links every eligible toolkit plugin into the OCLIF manager.
- `packages/hq-sdk/src/plugins.ts:1` is explicitly a pre-Effect binding seam for plugin and app projections.
- `RAWR_Canonical_Architecture_and_Runtime_Spec_Integrated_Final.md:968` lists target role-first root `plugins/cli/commands/*`.
- `RAWR_Canonical_Architecture_and_Runtime_Spec_Integrated_Final.md:1024` names `defineCliCommandPlugin`.
- `RAWR_Canonical_Architecture_and_Runtime_Spec_Integrated_Final.md:1314` requires manifest shape `role -> surface -> plugin membership`.
- `RAWR_Effect_Runtime_Subsystem_Canonical_Spec.md:1076` states that plugins describe binding, runtime performs binding, and services receive canonical boundary bags.
- `RAWR_Effect_Runtime_Subsystem_Canonical_Spec.md:1262` includes `cli?: CliSurfaceRuntime` in the canonical started process shape.
- `RAWR_Effect_Runtime_Subsystem_Canonical_Spec.md:1374` says web and CLI harnesses follow the same runtime-subsystem contract.

## Open Assumptions Carried Forward

- The current `toolkit` term is not accidental legacy noise. It appears to encode an intended agent-runtime distribution path where a RAWR plugin can also provide Claude Code/Codex-style plugin artifacts, skills, workflows, or command banks.
- Native OCLIF command-plugin identity should still be separate from that `toolkit` distribution facet.
- The target architecture should optimize local development and CLI composition first, then support published npm or cloned-repo installation as a second-order distribution path.
