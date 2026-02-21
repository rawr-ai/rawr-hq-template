# AGENT 4 PLAN (VERBATIM)

You are P4 (Steward reviewer + integration arbiter) for Phase D planning in:
/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet
Branch: codex/phase-d-planning-packet

Goal:
Integrate P1/P2/P3 outputs into canonical Phase D planning artifacts, then run independent steward review and produce disposition.

Required protocol:
1) Immediately write plan verbatim:
/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-d-planning-pass-01-2026-02-21/AGENT_4_PLAN_VERBATIM.md
2) Maintain timestamped scratchpad:
/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-d-planning-pass-01-2026-02-21/AGENT_4_SCRATCHPAD.md
3) Produce review report:
/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-d-planning-pass-01-2026-02-21/AGENT_4_REVIEW_REPORT.md
4) If fixes needed, apply them directly in canonical planning docs and produce re-review report:
/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-d-planning-pass-01-2026-02-21/AGENT_4_RE_REVIEW_REPORT.md

Required introspection:
- /Users/mateicanavra/.codex-rawr/skills/information-design/SKILL.md
- /Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md
- /Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md
- /Users/mateicanavra/.codex-rawr/skills/domain-design/SKILL.md
- /Users/mateicanavra/.codex-rawr/skills/api-design/SKILL.md
- /Users/mateicanavra/.codex-rawr/skills/docs-architecture/SKILL.md
- /Users/mateicanavra/.codex-rawr/skills/team-design/SKILL.md
- /Users/mateicanavra/.codex-rawr/prompts/dev-spec-to-milestone.md
- /Users/mateicanavra/.codex-rawr/prompts/dev-harden-milestone.md

Read full grounding corpus listed in ORCHESTRATOR_PLAN_VERBATIM.md plus these P-agent outputs:
- AGENT_1_FINAL_PHASE_D_ARCHITECTURE_AND_ORDERING.md
- AGENT_2_FINAL_PHASE_D_INTERFACES_AND_FILE_MAP.md
- AGENT_3_FINAL_PHASE_D_GATES_AND_VERIFICATION.md

Canonical planning docs to create/update now:
- /Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_D_EXECUTION_PACKET.md
- /Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_D_IMPLEMENTATION_SPEC.md
- /Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_D_ACCEPTANCE_GATES.md
- /Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_D_WORKBREAKDOWN.yaml
- /Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_D_REVIEW_DISPOSITION.md
- /Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_D_PLANNING_HANDOFF.md

Requirements:
- preserve invariant locks (route boundaries, manifest authority, runtime semantics).
- include conditional D4 criteria and required artifacts.
- include owner/dependency/touched paths/gates per slice.
- include forward-only posture.
- include severity-ranked findings in review report and a final disposition of approve/approve_with_changes/not_ready.
- If not_ready or approve_with_changes, apply required fixes and issue re-review report to close to approve.

Final outputs (review docs) must include:
- Skills Introspected
- Evidence Map (absolute paths + line anchors)
- Assumptions
- Risks
- Unresolved Questions

Commit docs-only changes and return commit hash + clean status.
