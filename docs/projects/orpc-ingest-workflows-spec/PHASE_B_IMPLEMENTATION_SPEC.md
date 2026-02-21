# Phase B Implementation Spec

## 0) Document Contract
This document is the deep implementation reference for Phase B.

- Sequence entrypoint: `PHASE_B_EXECUTION_PACKET.md`
- Gate contract: `PHASE_B_ACCEPTANCE_GATES.md`
- Work breakdown map: `PHASE_B_WORKBREAKDOWN.yaml`

## 1) Purpose and Non-Goals

### 1.1 Purpose
Convert Phase A seam decisions into implementation-safe interfaces and structural verification so downstream phases can execute without reopening foundational architecture choices.

### 1.2 Non-Goals
1. No rollback matrix/program.
2. No distribution UX/productization expansion in this phase.
3. No reopening D-005..D-016.
4. No broad refactor bucket outside `B0..B3` core objectives.

### 1.3 Current Runtime Reality (as-landed through B4A on 2026-02-21)
1. `B0` is landed with host-evidence `/rpc` auth classification; blocking review finding closure is complete.
2. `B1`/`B2` are landed with manifest-first authority preserved and package-owned runtime seam consumption in host composition.
3. `B3` structural hardening is landed through canonical gate scripts/tests (`phase-a:gates:exit`, `verify-gate-scaffold`, `verify-harness-matrix`, route matrix + gate scaffolds).
4. Dedicated adapter-shim ownership test files are not present in landed branch state; canonical anti-regression for workspace/install seams is structural gate enforcement (`metadata-contract` + `import-boundary`), not missing-file requirements.
5. `B4` review closure is `ready` with no unresolved blocking/high findings.
6. `B4A` structural assessment landed refactors (shared AST helper extraction and gate/test robustness polish) without route/authority/policy changes.

## 2) Phase B Interface Deltas

### 2.1 B0: RPC auth classifier seam (internal)
Planned additions:
1. `RpcAuthEvidence` type (host-derived evidence inputs).
2. `resolveRpcCallerClass(evidence): RpcCallerClass` classifier function.
3. `isRpcRequestAllowed` delegates to classifier seam rather than direct header trust.

Constraints:
1. Preserve current public route behavior for valid first-party/internal callers.
2. Preserve deny-by-default for unlabeled/external/runtime-ingress.

### 2.2 B1: Workflow trigger router scope seam
Planned additions:
1. Trigger/status-scoped router composition surface in core package.
2. Contract drift check for workflow trigger surface.

Constraints:
1. `rawrHqManifest.workflows.triggerRouter` remains plugin/workflow-scoped.
2. No `/rpc/workflows` route family introduced.

### 2.3 B2: Manifest/host composition seam
Planned additions:
1. Package-owned `runtime-router` seam.
2. Host wiring consumes package seam via manifest.

Constraints:
1. `rawr.hq.ts` remains composition authority.
2. Import direction stays package-owned -> host composition, not reverse.

### 2.4 B3: Structural verification seam
Planned additions:
1. Structural ownership assertions in gate scripts.
2. Structural anti-regression enforcement for package-owned workspace/install seams via `metadata-contract` + `import-boundary` gate checks in the canonical exit chain.

Constraints:
1. Existing D-015 suite IDs and negative assertions remain mandatory.
2. Structural checks must be deterministic and non-flaky.

## 3) Slice Implementation Detail

### 3.1 B0 Implementation Units
1. Classifier seam module:
   - `apps/server/src/auth/rpc-auth.ts` (new)
2. ORPC integration:
   - `apps/server/src/orpc.ts`
3. Host evidence wiring:
   - `apps/server/src/rawr.ts`
4. Tests:
   - `apps/server/test/rpc-auth-source.test.ts` (new)
   - `apps/server/test/orpc-handlers.test.ts`
   - `apps/server/test/rawr.test.ts`
   - `apps/server/test/route-boundary-matrix.test.ts`

Parallel lanes (non-overlap):
1. Runtime seam lane (`src/auth`, `orpc.ts`, `rawr.ts`)
2. Test lane (`apps/server/test/*`)

### 3.2 B1 Implementation Units
1. Core router scope split:
   - `packages/core/src/orpc/hq-router.ts`
   - `packages/core/src/orpc/index.ts`
2. Manifest binding updates:
   - `rawr.hq.ts`
   - `apps/server/src/orpc.ts`
3. Tests:
   - `packages/core/test/workflow-trigger-contract-drift.test.ts` (new)
   - `packages/core/test/__snapshots__/workflow-trigger-contract-drift.test.ts.snap` (new)
   - `apps/server/test/rawr.test.ts`
   - `apps/server/test/route-boundary-matrix.test.ts`

Parallel lanes:
1. Core contract lane (`packages/core/src`, `packages/core/test`)
2. Host/manifest lane (`rawr.hq.ts`, `apps/server/src/orpc.ts`)
3. Boundary regression lane (`apps/server/test/*`)

### 3.3 B2 Implementation Units
1. Package seam extraction:
   - `packages/core/src/orpc/runtime-router.ts` (new)
   - `packages/core/src/orpc/index.ts`
2. Host seam consumers:
   - `apps/server/src/orpc.ts`
   - `apps/server/src/workflows/context.ts`
   - `rawr.hq.ts`
3. Tests:
   - `packages/core/test/runtime-router.test.ts` (new)
   - `apps/server/test/orpc-openapi.test.ts`
   - `apps/server/test/rawr.test.ts`

Parallel lanes:
1. Package extraction lane (`packages/core/src`, `packages/core/test`)
2. Host adoption lane (`apps/server/src`, `rawr.hq.ts`)

### 3.4 B3 Implementation Units
1. Gate script hardening:
   - `scripts/phase-a/manifest-smoke.mjs`
   - `scripts/phase-a/verify-gate-scaffold.mjs`
   - `scripts/phase-a/verify-harness-matrix.mjs`
2. Structural test coverage:
   - `apps/server/test/route-boundary-matrix.test.ts`
   - `apps/server/test/phase-a-gates.test.ts`
   - `packages/hq/test/phase-a-gates.test.ts`
   - `plugins/cli/plugins/test/phase-a-gates.test.ts`

Parallel lanes:
1. Script lane (`scripts/phase-a/*`)
2. Server matrix lane (`apps/server/test/*`)
3. Workspace/install seam ownership lane (`packages/hq/test`, `plugins/cli/plugins/test`)

## 4) Review, Docs, and Realignment Slices

### 4.1 B4 Review + Fix Closure
1. Mandatory independent review perspectives:
   - TypeScript design
   - ORPC boundary/contract behavior
2. Blocking/high findings: must be fixed before phase exit.
3. Medium findings: defer only with owner + rationale + target slice.

### 4.2 B4A Structural Assessment + Taste Pass
1. Mandatory independent structural assessment from:
   - TypeScript design perspective
   - Solution-design/system-shape perspective
2. Review focus:
   - naming quality,
   - domain boundary clarity,
   - file/module organization quality,
   - reduction of future confusion without changing locked architecture.
3. Scope guardrail:
   - allowed: local structural polish and organization improvements;
   - disallowed: fundamental route/authority/policy shifts or architecture reopen.
4. Findings handling:
   - blocking/high structural findings: fix in-run;
   - medium findings: explicit disposition with owner and rationale.

### 4.3 B5 Docs + Cleanup
1. Update canonical packet docs and relevant runbooks.
2. Archive/delete superseded pass-local artifacts.
3. Publish cleanup manifest with rationale.

### 4.4 B6 Realignment
1. Reconcile packet assumptions for next phase.
2. Publish explicit readiness posture and blocker ownership.

## 5) Failure Modes and Immediate Responses
1. `B0`: auth false-deny or bypass.
   - First response: isolate classifier mapping; rerun `orpc-handlers`, `rawr`, route matrix.
2. `B1`: trigger router overexposure.
   - First response: validate workflow scope contract; rerun workflow route regression tests.
3. `B2`: coupling/import cycle.
   - First response: inspect import graph of `rawr.hq.ts`, core seam exports, host consumers.
4. `B3`: false-green gates.
   - First response: ensure structural assertions cover ownership and not only text markers.

## 6) Phase B Exit Conditions
1. `B0..B3` complete and green in dependency order.
2. `B4` review closure has no unresolved blocking/high findings.
3. `B4A` structural assessment is completed and dispositioned.
4. `B5` docs and cleanup outputs published.
5. `B6` next-phase readiness is explicit and non-contradictory.
6. Deferred list remains centralized and non-blocking.
