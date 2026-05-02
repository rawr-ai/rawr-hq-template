# Workstream Plugin Pack Next Work

## Status

The pack is contained locally and reviewable as one unit. Generic workstream
skills, assets, steward briefs, hook scripts, hook config, and downstream port
notes live under `tools/workstream-plugin-pack/`.

Live `.agents/.codex` activation files are intentionally absent. Use
`scripts/install-local-codex-pack.ts` only when local activation/testing is
needed.

Temporary downstream projection is now part of the bridge plan:
`scripts/install-local-codex-pack.ts --target downstream` can project this pack
into downstream `rawr-hq/plugins/agents/habitat`, but upstream
`tools/workstream-plugin-pack/` remains canonical until hook projection lands in
`agent-config-sync`.

Runtime Realization Lab docs are overlays only. They may add lab authority,
proof classes, gates, evidence homes, and phase dossier guidance, but they must
not own the generic workstream lifecycle or record model.

## Contained Review Result

- Review passed on the runner skill, review-loop skill, assets, steward briefs,
  hooks, and runtime-lab boundary.
- The minimal and full record assets cover small and complex workstreams
  without making record maintenance the objective.
- Closure language now requires an objective outcome: achieved, partially
  achieved, or not achieved.
- Unsupported or unavailable hook events are documented as portability caveats.
  Hooks do not parse workstream Markdown.
- Local projection is ready to test through `scripts/install-local-codex-pack.ts`.

## Deferred

- Remove the temporary upstream-to-downstream projection bridge after
  `agent-config-sync` supports hook projection and the Workstream plugin has
  been used successfully a few times without issues.
- Decide downstream hook activation mechanics when the plugin sync surface is
  ready; reusable hook scripts can move before provider-local activation is
  automatic.
- Do not sync or install downstream `plugins/agents/habitat` until activation
  is explicitly requested.

## Green Locally Means

- Pack content is coherent without relying on deleted repo-local templates.
- The runner and review-loop skills close objective, execution, review, repair,
  closure, and handoff loops.
- Runtime-lab docs remain complementary overlays.
- `scripts/install-local-codex-pack.ts --target local --dry-run` and
  `--target downstream --dry-run` show the expected projections.
- Hook smoke checks, pack hook JSON parse, runtime structural guard, and
  `git diff --check` pass.
