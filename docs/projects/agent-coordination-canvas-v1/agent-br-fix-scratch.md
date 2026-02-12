# Agent BR Fix Scratch

## Findings Log
- 2026-02-12T23:18:00Z: Introspection completed.
  - `/coordination` route composition still mounts generic host shell instead of dedicated coordination shell boundary.
  - `CanvasWorkspace` currently does not mount `WorkflowSidePanel`; side-panel toggle/state contract must be added.
  - Bridge layer must enforce save-before-run semantics in `useWorkflow` to eliminate unsaved run bug.
  - Monitor link strategy must come from runtime trace links or runtime-derived config; hardcoded `:8288` path must be removed.
  - Styling bridge should prefer shared tokenized primitives and reduce bespoke per-component style divergence.

## Bridge Contract Checks
1. No mocked state path remains.
2. Mapping is deterministic and typed.
3. Status panel and toolbar states are runtime-driven.
