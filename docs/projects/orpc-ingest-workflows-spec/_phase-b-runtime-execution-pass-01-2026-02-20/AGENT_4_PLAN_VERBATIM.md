# Agent 4 Plan (Verbatim)

## Mission
Perform a full independent review of landed Phase B slices B0-B3 from TypeScript + oRPC perspectives, identify risks/regressions/design issues, and drive fix closure for blocking/high findings.

## Protocol
1) Complete required introspection before review conclusions:
- /Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md
- /Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md
- /Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md
- /Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md
- /Users/mateicanavra/.codex-rawr/skills/api-design/SKILL.md
- /Users/mateicanavra/.codex-rawr/prompts/dev-spec-to-milestone.md
- /Users/mateicanavra/.codex-rawr/prompts/dev-harden-milestone.md
2) Read grounding corpus before conclusions:
- docs/projects/orpc-ingest-workflows-spec/README.md
- docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md
- docs/projects/orpc-ingest-workflows-spec/DECISIONS.md
- docs/projects/orpc-ingest-workflows-spec/PHASE_B_EXECUTION_PACKET.md
- docs/projects/orpc-ingest-workflows-spec/PHASE_B_IMPLEMENTATION_SPEC.md
- docs/projects/orpc-ingest-workflows-spec/PHASE_B_ACCEPTANCE_GATES.md
3) Review scope:
- B0 RPC auth-source hardening
- B1 workflow trigger router isolation
- B2 manifest/host seam hardening
- B3 structural gate hardening
4) Perform full independent TypeScript + oRPC review across landed B0-B3 implementation.
5) Identify blocking/high/medium/low findings with concrete fixes.
6) Implement fixes for blocking/high findings and validate.
7) Produce final report with required sections and disposition.

## Deliverables
- AGENT_4_PLAN_VERBATIM.md
- AGENT_4_SCRATCHPAD.md (timestamped ongoing notes)
- AGENT_4_REVIEW_REPORT.md
