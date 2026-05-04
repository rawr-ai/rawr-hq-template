# Next Packet — Post-Workstream Continuation

Continuation target: workstream closed; this packet covers the residual sync sub-question and what a future DRA should inspect first.

Successor workstream, if any: a small "deployed-copy sync" workstream may be needed depending on the user's answer to the sync sub-question below. If the answer is "the existing install script's `--target=downstream` already covers the deployed copy via configured `--downstream-root`," no successor workstream is needed; the future DRA simply re-runs the script after merging this PR. If the answer is "the deployed copy on the user's local machine is governed by a different sync mechanism," a small workstream may be needed to either extend `tools/workstream-plugin-pack/scripts/install-local-codex-pack.ts` or to author whatever sync hook is appropriate for the deployed location.

Why this is next: the brief's "What success looks like" specifies the deployed `habitat:workstream-runner` skill being usable in subsequent sessions; the in-place edits land in source but the deployed copy on the user's local machine does not auto-sync from source. The user must either run a manual sync after merge or answer the sub-question below so that a successor workstream can close the loop.

## Current branch / stack

- This branch: `workstream-runner-skill-improvements`, stacked on `docs/workstream-runner-skill-improvement-plan` (the brief).
- Parent branch: `docs/workstream-runner-skill-improvement-plan` is on PR #309.
- This branch's PR: opened in Phase 2 closure (see record.md §Final Output once populated post-PR).
- Stack tool: `gt` per `docs/process/GRAPHITE.md`.

## What changed

Six in-place recommendations landed at `tools/workstream-plugin-pack/skills/workstream-runner/`:

| Rec | Files | Commit |
|---|---|---|
| #1 | `SKILL.md` (Step 0) + `references/before-you-frame.md` (new) | 8602f7c0 |
| #2 | `assets/decisions.md` (new) + `SKILL.md` (Asset Map row + Quality Gate + Step 4) | 6ee32b2c |
| #3 | `SKILL.md` (Step 8 DRA finalize) + `references/closure.md` (reinforcement) | 342a6a9d |
| #4 | `SKILL.md` (Step 1 expansion) | 54fb1b0c |
| #5 | `references/coordination-patterns.md` (new) + `SKILL.md` (Reference Map row) | 00da0d62 |
| #6 | `references/records-and-packets.md` (sizing rubric) | a0447cea |

Plus: Phase 0 scaffolding (bb514d8e), opening-steward repairs (28ca6a63), opening-steward verdict finding (6fabb8d2), voice repairs (c6ef04cb), and DRA-finalize / closure commits (post-this-file).

## What is done

- All six brief recommendations applied in-place, voice-matched and voice-reviewed.
- Workstream artifacts (record + decisions + lane plan + per-lane findings + composed voice review) under `docs/projects/workstream-runner-skill-improvements/workstreams/runner-skill-improvements/`.
- Brief §5.5 stop condition (> 2 recs P1) did not fire; voice review verdict pass (0 P1, 1 P2, 3 P3); all accepted findings repaired.
- Default Workflow numbering integrity verified post-insertion of Step 0 + Step 8.
- Brittleness-guard wording (Rec #1) verbatim-equal to brief §3.1.

## What is not done

- The deployed plugin copy on the user's local machine is not synced from this branch's source. Sync is manual per `tools/workstream-plugin-pack/scripts/install-local-codex-pack.ts` (no watcher, no hook, no auto-sync).
- The install script's `--target=downstream` writes to a configured `--downstream-root`. Whether that root is the same path layout as the deployed copy on the user's local machine is unknown to this DRA — see sub-question below.

## What to inspect first

For a future DRA picking this up cold, in this order:

1. The improved `tools/workstream-plugin-pack/skills/workstream-runner/SKILL.md` — confirm Step 0 (Before you frame), the new Step 8 (DRA finalize), and the new Reference Map / Asset Map rows + Quality Gate are all present. This is the canonical source.
2. This packet plus `record.md`, `decisions.md`, `lane-plan.md`, and `findings/composed-voice-review.md` in this workstream's directory — for full traceability.
3. The sync sub-question below.

## Exact next action

For the user (after PR merge):

1. Confirm whether the install script's configured `--downstream-root` already points at the deployed plugin copy's parent directory on the local machine. If yes, run `bun tools/workstream-plugin-pack/scripts/install-local-codex-pack.ts --target=downstream` (or the project's equivalent invocation) to sync.
2. If the deployed copy lives somewhere the install script does not write to, decide whether to (a) extend the install script with a new target, (b) author a new sync mechanism (hook, watcher, or manual runbook) for that location, or (c) accept manual file copy as the workflow.

For a future DRA, only if the user answers (b): open a small workstream against the install script with the answer as the opening input.

## Required first reads

If you are a future DRA picking this up:

1. `docs/projects/workstream-runner-skill-improvements/README.md` — the original brief.
2. `docs/projects/workstream-runner-skill-improvements/workstreams/runner-skill-improvements/record.md` — this workstream's record.
3. This packet.
4. `tools/workstream-plugin-pack/scripts/install-local-codex-pack.ts` and `tools/workstream-plugin-pack/notes/downstream-port-notes.md` — for sync mechanics.

## First commands

```
gt ls
git log --oneline workstream-runner-skill-improvements ^main
cat tools/workstream-plugin-pack/skills/workstream-runner/SKILL.md
```

## Deferred items to consume

One: the deployed-copy sync sub-question above. Owner: user (decides which path the deployed copy is governed by). Re-entry trigger: any session in which the improved `habitat:workstream-runner` skill should take effect — confirm sync ran first.
