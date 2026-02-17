# Agent Coordination Canvas v1 - Implementation Plan

Status: In Progress  
Owner: Orchestrator (Agent A)

## Intent (PRD-Style)

### Problem Statement
RAWR needs a first-party, keyboard-first surface for designing and operating agent coordination workflows as explicit handoff graphs. Existing surfaces do not provide a durable, typed model of who owns responsibility, what inputs are required, what outputs are guaranteed, and how handoffs are validated and observed at runtime.

### Core Objective
Ship an end-to-end coordination canvas that supports design, execution, validation, and observability for agent handoff workflows, using Inngest-first orchestration and strict typed contracts.

### Primary User
Solo operator designing and running coordination flows.

### Success Criteria
1. Operators can create and edit coordination workflows as desk/handoff graphs.
2. Incompatible handoffs are blocked by typed validation.
3. Workflows can be run from UI and CLI with parity.
4. Runs expose timeline + tracing + logs with per-node visibility.
5. Per-node desk memory persists across runs.

### Non-Goals
1. Prompt engineering workspace.
2. Low-level automation-step authoring UI.
3. Replatforming to Vercel Microfrontends Groups in v1.

## Plan (Decision-Complete)

### Execution Workflow Guardrails
1. All implementation in dedicated worktree branch `codex/agent-a-coordination-canvas-v1`.
2. Graphite-first mutations; stack safety defaults: `gt sync --no-restack` and `gt restack --upstack` only for active stack.
3. No cross-worktree edits.
4. No ad-hoc history rewrites.

### Architecture Placement
1. Destination: `RAWR HQ-Template` first.
2. Apps:
   - `apps/web`: first-party coordination route and canvas UX.
   - `apps/server`: orchestration and run-query APIs.
3. Packages:
   - coordination schema/contracts package.
   - Inngest adapter package.
   - coordination observability package.
4. Plugins:
   - unchanged role; remain extension surfaces only.

### Domain Model
1. Desk node:
   - `deskId`, `name`, `responsibility`, `domain`, `inputSchema`, `outputSchema`, `memoryScope`, `runtimePolicy`.
2. Handoff edge:
   - `fromDeskId`, `toDeskId`, optional `condition`, `mappingRefs`.
3. Workflow:
   - `workflowId`, `version`, `desks[]`, `handoffs[]`, `entryDeskId`, `observabilityProfile`.

### Inngest Mapping
1. Desk type -> `EngineAction.kind`.
2. Node instance -> `WorkflowAction`.
3. Handoffs -> `edges` + refs.
4. Explicit join nodes required for fan-in.
5. Async external handoffs via wait-for-event actions.

### Public Surfaces
1. Types:
   - `CoordinationWorkflowV1`, `DeskDefinitionV1`, `HandoffDefinitionV1`, `DeskMemoryRecordV1`, `RunStatusV1`, `DeskRunEventV1`, `RunTraceLinkV1`.
2. Server APIs:
   - `GET /rawr/coordination/workflows`
   - `POST /rawr/coordination/workflows`
   - `GET /rawr/coordination/workflows/:id`
   - `POST /rawr/coordination/workflows/:id/validate`
   - `POST /rawr/coordination/workflows/:id/run`
   - `GET /rawr/coordination/runs/:runId`
   - `GET /rawr/coordination/runs/:runId/timeline`
3. CLI commands:
   - `rawr workflow coord create`
   - `rawr workflow coord validate <workflow-id>`
   - `rawr workflow coord run <workflow-id>`
   - `rawr workflow coord status <run-id>`
   - `rawr workflow coord trace <run-id>`

### Phases
1. WT-0: worktree + Graphite setup.
2. WT-1: documentation bootstrap.
3. Phase 0: Inngest + Vercel validation spikes and version pin.
4. Phase 1: domain schema + blocking validators + compiler to runtime model.
5. Phase 2: keyboard-first canvas UX route.
6. Phase 3: run execution + timeline/tracing/logs + app-specific observability.
7. Phase 4: CLI parity command suite.
8. Phase 5: hardening and conformance tests.

### Test Matrix
1. Valid A->B->C run passes.
2. Schema-incompatible edge blocked.
3. Cycle blocked.
4. Disconnected node blocked.
5. Fan-in requires explicit join node.
6. Conditional branch contracts validated.
7. Retry semantics avoid duplicate side effects outside guarded steps.
8. Per-node memory persists across runs.
9. Timeline ordering and trace links visible.
10. UI/CLI parity for validate/run status.
11. Failure propagation and diagnostics correctness.
12. Security/config guardrails on runtime execution.

### Assumptions
1. ingest.dev interpreted as Inngest.
2. Bun-only tooling/runtime.
3. Local-first RAWR architecture retained in v1.
4. Template-core capability with downstream sync later.
