# SESSION_019c587a_AGENT_LINKAGE_RESHAPE_EXEC_PLAN_VERBATIM

## Mission
Own parity and link migration artifacts only for reshape execution.

## Workspace
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal`

## Ownership Boundary
Owned outputs only:
1. `docs/projects/flat-runtime/RESHAPE_SNIPPET_PARITY_MAP.yaml`
2. `docs/projects/flat-runtime/RESHAPE_LINK_MIGRATION_REPORT.md`

Out of scope:
1. Policy/spec prose edits
2. Any file edits outside owned outputs (unless explicitly requested by orchestrator)

## Mandatory Pre-Edit Gate (Completed)
1. Skill introspection:
   - `/Users/mateicanavra/.codex-rawr/skills/information-design/SKILL.md`
   - `/Users/mateicanavra/.codex-rawr/skills/docs-architecture/SKILL.md`
   - `/Users/mateicanavra/.codex-rawr/skills/deep-search/SKILL.md`
   - `/Users/mateicanavra/.codex-rawr/skills/decision-logging/SKILL.md`
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

## Execution Plan
1. Build source inventory:
   - Enumerate fenced code blocks in official corpus docs.
   - Capture source doc path, fence language, ordinal, and content hash.
2. Build destination mapping:
   - Use reshape file-disposition mapping to project destination files under `docs/projects/flat-runtime/**`.
   - Mark expected relocation targets for each snippet.
3. Build stale-link migration report:
   - Derive old→new path map from reshape proposal/system architecture plan.
   - Scan active docs (excluding `docs/projects/_archive/**`) for stale references to old packet/session paths.
   - Record pass/fail with file paths and unresolved items.
4. Output only owned linkage artifacts.

## Safety Gates
1. No policy wording modifications.
2. No edits outside owned outputs.
3. Explicitly mark unresolved mapping or missing-destination conditions as pending steward verification.

## Required Deliverables
1. `docs/projects/flat-runtime/RESHAPE_SNIPPET_PARITY_MAP.yaml`
2. `docs/projects/flat-runtime/RESHAPE_LINK_MIGRATION_REPORT.md`
