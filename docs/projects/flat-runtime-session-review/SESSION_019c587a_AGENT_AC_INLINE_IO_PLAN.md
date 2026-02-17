# SESSION_019c587a — Agent AC Inline-I/O Normalization Plan

## Objective
Normalize packet/posture policy so docs/examples default to inline procedure I/O schemas, allow extraction only for explicit exceptions, and standardize extracted schema shape as paired `.input` and `.output`.

## Locked Scope
1. Policy/spec docs only (no runtime code changes).
2. Owned files only.
3. Keep architecture and split posture unchanged.

## Non-Goals
1. No plugin/runtime behavior redesign.
2. No contract ownership relocation beyond wording/snippet normalization.
3. No edits outside owned files.
4. No commit.

## Execution Checklist
- [x] Validate worktree context and ignore unrelated edits.
- [x] Locate all owned files and handle missing owned files in this worktree.
- [x] Add explicit inline-I/O default policy in posture-level and packet-level docs.
- [x] Add explicit exception policy for shared/large readability extraction.
- [x] Codify canonical extracted shape as paired object (`.input`, `.output`).
- [x] Normalize owned snippets that used separate `*InputSchema`/`*OutputSchema` constants.
- [x] Record decision-lock update in packet `DECISIONS.md`.
- [x] Verify edits are limited to owned files.

## Completion Criteria
1. Inline-I/O baseline policy is explicit and repeated at subsystem + packet + relevant axis surfaces.
2. Exception criteria are explicit and narrow.
3. Extracted-shape guidance is canonical and reflected in snippets.
4. No architecture/posture drift introduced.
