# Agent B Scratchpad

## Timeline (UTC)

- 2026-02-06: Loaded required skills (`skill-creator`, `docs-architecture`, `graphite`, `plugin-content`, `bun`).
- 2026-02-06: Confirmed deliverable paths and discovered target runbook/agent-b files were not present yet.
- 2026-02-06: Reviewed command-surface invariants in `docs/system/PLUGINS.md`, `docs/PROCESS.md`, `apps/AGENTS.md`, `apps/cli/AGENTS.md`, and `plugins/AGENTS.md`.
- 2026-02-06: Verified CLI command contracts from source:
  - `apps/cli/src/commands/factory/plugin/new.ts`
  - `apps/cli/src/commands/hq/plugins/{list,enable,disable,status}.ts`
- 2026-02-06: Confirmed root script invocation path is `bun run rawr -- ...` from repo root.
- 2026-02-06: Ran command validation in template repo:
  - `factory plugin new ... --dry-run --json` returns deterministic planned files.
  - `hq plugins list|enable|status|disable --json` outputs stable machine-readable payloads.
  - `plugins link <absolute-path> --install` + `plugins inspect <plugin> --json` confirms Channel A local consume path.
  - `turbo run build/test --filter=@rawr/plugin-{mfe-demo,hello}` passes for sample packages.
- 2026-02-06: Verified Channel A install rehearsal behavior:
  - `plugins install /absolute/path` fails (path coerced into GitHub-style resolution).
  - `plugins install file://<absolute-path>` succeeds; added this as canonical local install rehearsal form.
- 2026-02-06: Authored `docs/process/PLUGIN_E2E_WORKFLOW.md` in template repo and mirrored to personal repo path.
- 2026-02-06: Ran final command-surface scan on both runbook copies to confirm:
  - Channel A references remain `rawr plugins ...`
  - Channel B references remain `rawr hq plugins ...`

## Breadcrumbs

- Primary policy source for plugin channels: `docs/system/PLUGINS.md`.
- Process rule for channel split: `docs/PROCESS.md`.
- Existing loop reference: `docs/process/AGENT_LOOPS.md` (loops B/C), to be specialized into a focused E2E runbook.
- Sample plugin packages used as grounding:
  - `plugins/hello` (Channel A oclif plugin)
  - `plugins/mfe-demo` (Channel B runtime plugin)

## Draft Direction

- Provide two explicit runbook tracks:
  - Channel A oclif plugin path (`rawr plugins link/install/inspect`)
  - Channel B workspace runtime path (`rawr hq plugins list/enable/disable/status`)
- Keep both tracks deterministic and repo-root oriented.
- Add failure modes for:
  - workspace root detection failures
  - security gate block on enable
  - plugin ID mismatch (dir name vs package name)
  - oclif command discovery issues after link/install

## Open Questions

- None at this stage.
