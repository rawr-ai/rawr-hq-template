# Phase 2 Orchestrator scratchpad

Purpose: integrator notes, integration sequencing, conflicts, and “what we learned”.

## Status
- [x] Phase 0 docs landed
- [~] Agents spawned + slices assigned (attempted; agent thread limit hit, proceeded orchestrator-only)
- [x] SE merged
- [x] JR merged
- [x] CF merged
- [x] SP merged
- [x] MFE merged
- [x] WF merged
- [~] Hardening plan merged (docs only) (in stack; not merged)

## Notes

### Long-lived stack policy (Phase 2)
- Default: keep a **long-lived Graphite stack** and submit PRs as drafts/reviewable slices.
- Merge only at explicit checkpoints / when requested.

### Landed capabilities (merged to `main`)
- **State enablement:** repo-local `.rawr/state/state.json`, `plugins enable/disable/status`, server mounts enabled-only.
- **Journal + reflect:** `.rawr/journal/*` + SQLite FTS, `journal tail/search/show`, `reflect`, CLI instrumentation writes command/event snippet.
- **Command factory:** `factory command/workflow/plugin new` (dry-run friendly) + tests.
- **Security posture tool:** `security posture` writes deterministic `latest.json` + `latest.md`.
- **Micro-frontend demo:** `plugins/mfe-demo`, enabled-only web module serving, host mounts enabled modules.
- **Three workflow commands:** `workflow forge-command`, `workflow demo-mfe`, `workflow harden` (dry-run + snippet emission).

### In-flight on the Phase 2 stack (unmerged)
- Cap journal retrieval limits (`--limit` default 10, max 15) to keep calls atomic.
- Server loader: support `dist/src/server.js` output shape.
- Phase 2 plan updates (decision log: merge policy, snippet caps, web dist paths).
- Security hardening plan doc (plan-only).
- Optional semantic search plumbing (`journal search --semantic`) gated by env keys.
