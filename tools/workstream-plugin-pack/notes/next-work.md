# Workstream Plugin Pack Next Work

## Status

The pack is contained locally and reviewable as one unit. Generic workstream
skills, assets, steward briefs, hook scripts, and hook config live under
`tools/workstream-plugin-pack/` as Template-owned tooling.

Live `.agents/.codex` activation files are intentionally absent. Use
`scripts/install-local-codex-pack.ts` only when local activation/testing is
needed.

The installer projects only into the current Template checkout. It has no
personal-repository or cross-repository projection mode.

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

- Publish a versioned generic-tool artifact only if a concrete consumer needs
  one; do not use a checkout path or copied tree as the interface.
- Keep provider-local activation separate from the generic workstream model.

## Green Locally Means

- Pack content is coherent without relying on deleted repo-local templates.
- The runner and review-loop skills close objective, execution, review, repair,
  closure, and handoff loops.
- Runtime-lab docs remain complementary overlays.
- `scripts/install-local-codex-pack.ts --dry-run` shows only the expected
  Template-local projections.
- Hook smoke checks, pack hook JSON parse, runtime structural guard, and
  `git diff --check` pass.
