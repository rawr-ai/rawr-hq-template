# WorkflowKit Interactive Orchestrator Scratch

## Session Setup
- Date: 2026-02-13
- Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1`
- Branch: `codex/coordination-fixpass-v1-cutover-purge`

## Working Cadence
1. Spawn up to two agents in parallel.
2. Gather evidence and options for remediation.
3. Integrate into one canonical findings + plan set.
4. Hold implementation until explicit go-ahead.

## Agent Assignments
- Agent WK-Runtime (`019c549b-e12b-7dd3-b85c-edcf7a392627`)
  - Focus: interactive WorkflowKit migration + runtime invariants.
  - Skill context: `inngest`.
- Agent WK-Design (`019c549b-e1b4-7f53-9841-109ddb66c3c0`)
  - Focus: MCP visual parity over interactive surface.
  - Skill context: `ui-design`.

## Decision Log
- 2026-02-13T00:00:00Z: User requested dedicated agent-led investigation for interactive WorkflowKit migration + design parity.
- 2026-02-13T00:08:00Z: Runtime agent confirmed visible canvas is static and editor is hidden.
- 2026-02-13T00:11:00Z: Design agent returned parity strategy for interactive-surface skinning.
- 2026-02-13T00:13:00Z: Orchestrator pulled MCP design directly via design MCP tools.
- 2026-02-13T00:14:00Z: Confirmed MCP source files include static/demo FlowCanvas and mock hooks; parity target will treat MCP as visual/composition source and WorkflowKit as functional source.

## Integrated Conclusions
1. We did not bypass WorkflowKit runtime, but we bypassed its interactive editor surface in the visible UI.
2. The immediate correction is architectural: visible interactive WorkflowKit editor, no hidden-engine static proxy.
3. Design parity remains required and achievable by skinning editor surface to MCP token/composition language.
4. Implementation should proceed in branch-sliced phases to isolate rendering swap, styling parity, behavior safety, and purge.
