# Agent C Scratchpad

## Objective Snapshot
Produce a concrete verification runbook aligned to `docs/projects/repo-split/IMPLEMENTATION_PLAN.md` Phase 5 and Phase 6 gates:
- tests
- plugin flows (workspace + oclif)
- publish dry-runs
- upstream sync smoke (personal repo)

## Current Repo Observations (from `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq`)
- Root scripts:
  - `bun run build`
  - `bun run test`
  - `bun run rawr -- <command>`
- Plugin packages currently discovered in `plugins/*`:
  - `@rawr/plugin-hello`
  - `@rawr/plugin-mfe-demo`
  - `@rawr/plugin-session-tools`
- `@rawr/plugin-session-tools` is currently linked in oclif plugin manager output.
- Running `rawr` commands may emit warning:
  - `@rawr/plugin-session-tools is a linked ESM module and cannot be auto-transpiled...`
  - treated as non-fatal when exit code + JSON assertions pass.

## Implementation Decisions

### Use absolute paths for `rawr plugins link`
- **Context:** `bun run rawr` is implemented as `bun run --cwd apps/cli rawr`; relative plugin paths can resolve against `apps/cli` instead of repo root.
- **Options:**
  - Use relative `plugins/<name>` paths.
  - Use absolute paths rooted at repo path.
- **Choice:** Use absolute paths in the runbook (`$repo/plugins/session-tools`).
- **Rationale:** Avoids cwd ambiguity and false negatives in link-flow validation.
- **Risk:** Slightly less portable commands, but deterministic for the split execution environment.

### Treat private plugins as dry-run publish-skips, not failures
- **Context:** Current plugin packages are marked `private: true`; `npm publish --dry-run` exits `0` with skip warning.
- **Options:**
  - Fail verification because package is private.
  - Accept skip as pass for non-publishable packages while still validating packability.
- **Choice:** Accept private-package skip as pass, require `npm pack --dry-run` success for all plugins.
- **Rationale:** Matches plan language (`where applicable`) and avoids blocking on intentional private state.
- **Risk:** Could mask a packaging defect in a plugin intended to become public later.

### Run upstream sync smoke in throwaway worktree branch
- **Context:** Need to verify template -> personal sync without mutating active branch/history.
- **Options:**
  - Merge directly in personal working branch and roll back.
  - Simulate merge in temporary worktree and delete it.
- **Choice:** Temporary worktree + `git merge --no-commit` + build/test + cleanup.
- **Rationale:** Non-destructive, isolated, and validates realistic merge/test behavior.
- **Risk:** Requires clean `origin/main` reference and available `/tmp` filesystem.

## Validation Notes For Plan Content
- Matrix commands include explicit pass/fail signals through exit codes and JSON assertions.
- Phase 5/6 mapping is explicitly included in the plan doc.
- No rename/create operations are included.

## Follow-up For Execution Owner
When template repo path is available:
1. Run preflight and all matrix steps in sequence.
2. Capture logs under `docs/projects/repo-split/evidence/`.
3. Feed outcomes back into orchestrator notebook and implementation plan checklist.
