# Coordination Canvas Design Integration Goals

## Purpose
Define the long-term operating model for integrating external design platforms (Magic Patterns first, provider-agnostic by design) with the RAWR coordination canvas runtime implementation.

This document establishes:
1. What the system should optimize for.
2. Who owns what across design, frontend, and backend.
3. How design artifacts become production behavior without drift.
4. How we keep optionality to swap design providers later (Magic Patterns -> Figma/Orchid/etc.).

## Decision Summary
1. Primary model: component-driven design integration.
2. Architecture: provider adapter boundary for design ingestion.
3. Ownership split:
Frontend owns composition, component contracts, hooks, and UX behavior.
Backend owns domain semantics, runtime invariants, and API contracts.
4. Source of truth split:
Design provider is source of truth for visual intent.
Repo is source of truth for runtime behavior and data wiring.
5. No full-app round-trip sync. We ingest targeted component/design surfaces only.

## Goals
1. Keep UI 1:1 with approved design intent (structure, spacing, tokens, interaction patterns).
2. Preserve runtime guarantees (save-before-run, structured errors, polling safety, trace links).
3. Enable repeatable, low-risk sync cycles from design system/components into the app.
4. Minimize merge conflict surface by integrating at component boundaries, not page rewrites.
5. Make design provider swappable behind a stable adapter contract.

## Non-Goals
1. Making generated design code the runtime source of truth.
2. Forcing backend semantics to match design-tool-local data shapes.
3. Supporting permanent compatibility shims between old and new UI architectures.

## Architecture Model

### 1) Layered Ownership
1. Design provider layer:
Owns visual composition artifacts (components, tokens, style conventions).
2. Design adapter layer (in repo):
Normalizes provider artifacts into internal design contracts.
3. Frontend integration layer:
Maps design contracts to interactive components and hook-driven state.
4. Backend/domain layer:
Provides canonical workflow/run state and invariants over stable endpoints.

### 2) Adapter Contract (Provider-Agnostic)
Each provider adapter must expose a stable ingestion contract:
1. Artifact identity: provider project/system ID, revision hash, timestamp.
2. Artifact scope: component files/tokens imported this cycle.
3. Change metadata: added/changed/removed surfaces.
4. Confidence flags: exact/partial/manual review required.

This allows:
1. Magic Patterns today via MCP.
2. Figma/Orchid later with no frontend/backend contract rewrite.

## Primary Workflow (Component-Driven)

### Step 1: Design Export/Ingest
1. Pull design components/tokens from provider (not full app pages by default).
2. Stage artifacts under a design-ingest boundary.
3. Record a sync manifest (provider, revision, imported surfaces, checksum/diff metadata).

### Step 2: Frontend Integration
1. Integrate/stitch ingested components into app composition.
2. Keep hooks and action contracts stable.
3. Preserve shell cohesion and micro frontend boundaries.
4. Run visual parity + interaction gates.

### Step 3: Backend Alignment
1. Validate that frontend state contracts map to backend envelopes.
2. Confirm invariant-preserving flows (save-before-run, status transitions, timeline).
3. Verify errors are structured and user-actionable.

### Step 4: Acceptance
1. Type and behavior tests pass.
2. Visual parity and accessibility gates pass.
3. No legacy/shim fallback remains.

## Frontend and Backend Collaboration Contract

### Collaboration Principle
Frontend and backend collaborate through explicit contracts, not implicit UI assumptions.

### Frontend Responsibilities
1. Define UI-facing hook contracts with explicit states:
`idle | loading | saving | running | success | error`.
2. Define component props as domain-oriented interfaces (not raw API payload mirrors).
3. Keep adapter/mappers centralized (single place for shape normalization).
4. Surface structured errors and recovery actions in UI semantics.
5. Own design parity checks and accessibility behavior.

### Backend Responsibilities
1. Own canonical workflow/run semantics and lifecycle rules.
2. Maintain stable endpoint paths and typed envelopes.
3. Provide structured error codes/messages/retriable metadata.
4. Preserve idempotency and lifecycle ordering guarantees.
5. Version contracts deliberately; do not leak internal schema churn.

### Shared Contract Surface
1. Shared types package for request/response/error contracts.
2. Shared state semantics for run/workflow statuses.
3. Shared test fixtures for known-good workflow/run timelines.
4. Shared glossary for status and action names.

### Fit-the-Glove Design Rule
Frontend should design hooks and component props to match backend domain semantics, not internal storage details.
Backend should shape envelopes to be UI-actionable without frontend reverse engineering.

In practice:
1. Hooks expose UI intent actions (`save`, `validate`, `run`, `openTrace`) and deterministic state.
2. Backend exposes intent-compatible operations with explicit failure semantics.
3. Mapper boundaries convert wire format to UI format once, centrally.

## Contract Patterns (Recommended)

### Hook Contract Example
```ts
type WorkflowActions = {
  save: () => Promise<void>;
  validate: () => Promise<void>;
  run: () => Promise<void>; // must enforce save-before-run
};

type WorkflowState = {
  isDirty: boolean;
  isSaving: boolean;
  isRunning: boolean;
  lastError?: { code: string; message: string; retriable: boolean };
};
```

### Backend Envelope Example
```ts
type ApiSuccess<T> = { ok: true; data: T };
type ApiError = {
  ok: false;
  error: {
    code: string;
    message: string;
    retriable: boolean;
    details?: unknown;
  };
};
```

## Provider Swap Readiness (Magic Patterns -> Figma/Orchid/etc.)
To stay swappable:
1. Never bind runtime behavior to provider-specific file names/classes.
2. Keep provider parsing in adapter packages/modules only.
3. Keep design tokens mapped to internal token aliases.
4. Use parity tests based on rendered behavior/composition, not provider implementation details.

## Quality Gates
1. Design parity gate:
Component structure, spacing, typography, and interaction parity vs approved design artifact.
2. Runtime behavior gate:
Save-before-run, structured errors, polling safety, status lifecycle.
3. Accessibility gate:
Focus order/visibility, labels, live region announcements, reduced motion.
4. Legacy purge gate:
No obsolete route/style/component fallback or dead mapping contracts.

## Operational Cadence
1. Weekly or milestone-based design ingest.
2. Sync manifest update every ingest.
3. FE/BE contract review before merge for any hook or envelope change.
4. Post-merge parity audit for drift detection.

## Exit Criteria for "Healthy System"
1. Designers can iterate in Magic Patterns without breaking runtime integration flow.
2. Engineers can ship backend changes without UI contract regressions.
3. Visual changes remain localized to component surfaces.
4. Runtime behavior remains stable across design iterations.
5. Provider swap requires adapter changes, not app-wide rewrites.
