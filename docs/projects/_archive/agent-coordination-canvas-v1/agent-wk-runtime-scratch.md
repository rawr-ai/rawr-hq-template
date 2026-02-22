# Agent WK Runtime Scratch

Date: 2026-02-13
Agent: WK-Runtime (`019c549b-e12b-7dd3-b85c-edcf7a392627`)

## Findings
- P1: The visible canvas is static and non-interactive because `FlowCanvas` renders fixed-position nodes/edges and mounts the real editor as a hidden layer.
  - Evidence:
    - `apps/web/src/ui/coordination/components/canvas/FlowCanvas.tsx:21-37` computes fixed layout positions.
    - `apps/web/src/ui/coordination/components/canvas/FlowCanvas.tsx:75` mounts `hiddenEngine` with `pointer-events-none` and `opacity-0`.
    - `apps/web/src/ui/coordination/components/canvas/CanvasWorkspace.tsx:71` passes editor subtree as `hiddenEngine`.
    - `apps/web/src/ui/coordination/components/CoordinationPage.tsx:162-171` mounts `Provider` + `Editor` + `Sidebar` but not as the primary visible surface.

## Recommended Architecture
- Make WorkflowKit editor the visible, primary canvas surface inside `CanvasWorkspace`.
- Keep save/validate/run and model bridge contracts unchanged via existing mapper roundtrips:
  - `toWorkflowKitWorkflow` / `fromWorkflowKitWorkflow`
  - `useWorkflow.handleEditorChange`

## Risks / Mitigations
- Risk: breaking save-before-run behavior.
  - Mitigation: preserve `useWorkflow.queueRun` flow and verify with integration test.
- Risk: losing polling stability.
  - Mitigation: keep `useRunStatus` token/cancellation model untouched.
- Risk: runtime trace/run regressions.
  - Mitigation: keep server + inngest adapter contracts unchanged.
