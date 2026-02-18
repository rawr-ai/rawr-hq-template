# SESSION_019c587a_AGENT_CLEANUP_RESHAPE_EXEC_PLAN_VERBATIM

## Mission
Execute aggressive-but-safe pre-work cleanup for reshape execution so the active area contains only reshape-relevant materials.

## Workspace
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal`

## Mandatory Read-Gate (Completed Before Any Moves)
1. Skills applied:
   - `/Users/mateicanavra/.codex-rawr/skills/information-design/SKILL.md`
   - `/Users/mateicanavra/.codex-rawr/skills/docs-architecture/SKILL.md`
   - `/Users/mateicanavra/.codex-rawr/skills/deep-search/SKILL.md`
2. Official spec corpus read:
   - `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/*.md`
   - `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/*.md`
   - `docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
3. Reshape inputs read:
   - `docs/projects/flat-runtime-session-review/RESHAPE_PROPOSAL.md`
   - `docs/projects/flat-runtime-session-review/CANONICAL_ASSESSMENT.md`
   - `docs/projects/flat-runtime-session-review/_RESHAPE_PLAN_SYSTEM_ARCHITECTURE.md`
   - `docs/projects/flat-runtime-session-review/_RESHAPE_PLAN_AUTHORITY_CONSOLIDATION.md`
   - `docs/projects/flat-runtime-session-review/_RESHAPE_PLAN_PACKET_INTERIOR.md`
   - `docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_RESHAPE_REVIEW_A.md`
   - `docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_RESHAPE_REVIEW_B.md`

## Archive Destination
`docs/projects/_archive/flat-runtime-session-review/session-artifacts/`

## Keep-Set (Must Remain Active)
1. `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/**`
2. `docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
3. `docs/projects/flat-runtime-session-review/RESHAPE_PROPOSAL.md`
4. `docs/projects/flat-runtime-session-review/CANONICAL_ASSESSMENT.md`
5. `docs/projects/flat-runtime-session-review/_RESHAPE_PLAN_SYSTEM_ARCHITECTURE.md`
6. `docs/projects/flat-runtime-session-review/_RESHAPE_PLAN_AUTHORITY_CONSOLIDATION.md`
7. `docs/projects/flat-runtime-session-review/_RESHAPE_PLAN_PACKET_INTERIOR.md`
8. `docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_RESHAPE_REVIEW_A*.md`
9. `docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_RESHAPE_REVIEW_B*.md`

## New Cleanup Artifacts (Must Remain Active)
1. `docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_CLEANUP_RESHAPE_EXEC_PLAN_VERBATIM.md`
2. `docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_CLEANUP_RESHAPE_EXEC_SCRATCHPAD.md`
3. `docs/projects/flat-runtime-session-review/SESSION_019c587a_RESHAPE_PREWORK_ARCHIVE_MANIFEST.yaml`
4. `docs/projects/flat-runtime-session-review/SESSION_019c587a_RESHAPE_PREWORK_ARCHIVE_REPORT.md`

## Archive Rule
Archive everything else under `docs/projects/flat-runtime-session-review/` that is not in Keep-Set and not in New Cleanup Artifacts.

## Execution Procedure
1. Enumerate all direct children of `docs/projects/flat-runtime-session-review/`.
2. Resolve protected paths from Keep-Set and New Cleanup Artifacts.
3. Freeze an explicit archive candidate list.
4. Move each candidate (files/directories) into `docs/projects/_archive/flat-runtime-session-review/session-artifacts/`.
5. Generate manifest and report from the frozen candidate list and post-move verification.

## Safety Gates
1. No files under `orpc-ingest-spec-packet/**` are moved.
2. `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` remains active.
3. None of the reshape input docs listed above are moved.
4. Cleanup artifacts, manifest, and report remain active.

## Required Outputs
1. `docs/projects/flat-runtime-session-review/SESSION_019c587a_RESHAPE_PREWORK_ARCHIVE_MANIFEST.yaml`
2. `docs/projects/flat-runtime-session-review/SESSION_019c587a_RESHAPE_PREWORK_ARCHIVE_REPORT.md`
