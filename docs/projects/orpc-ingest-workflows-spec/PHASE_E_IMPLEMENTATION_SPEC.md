# Phase E Implementation Spec

## Purpose
Implement Phase E hardening and decision closure to resolve D-009 and D-010 status with runtime evidence and durable gate enforcement.

## Non-Goals
1. No route topology changes.
2. No architecture pivots.
3. No rollback matrix.

## Deltas

### E1
1. Strengthen explicit dedupe-marker policy for heavy middleware chains.
2. Ensure marker evidence is structural and test-verified.

### E2
1. Harden finished-hook policy around idempotent/non-critical behavior.
2. Keep non-exactly-once semantics explicit in runtime and type contracts.

### E3
1. Add cleanup-safe evidence integrity verification.
2. Ensure disposition gates rely on durable closure artifacts only.

### E4
1. Close D-009 and D-010 when evidence supports lock transitions.
2. Otherwise publish explicit defer rationale with hardened watchpoints.

## Slice Detail

### E1 Implementation Units
- `apps/server/src/workflows/context.ts`
- `apps/server/src/orpc.ts`
- `apps/server/test/middleware-dedupe.test.ts`
- `scripts/phase-e/verify-e1-dedupe-policy.mjs`

### E2 Implementation Units
- `packages/coordination-inngest/src/adapter.ts`
- `packages/coordination/src/types.ts`
- `packages/coordination-inngest/test/inngest-finished-hook-guardrails.test.ts`
- `scripts/phase-e/verify-e2-finished-hook-policy.mjs`

### E3 Implementation Units
- `scripts/phase-e/_verify-utils.mjs`
- `scripts/phase-e/verify-e3-evidence-integrity.mjs`
- `package.json`

### E4 Implementation Units
- `docs/projects/orpc-ingest-workflows-spec/DECISIONS.md`
- `docs/projects/orpc-ingest-workflows-spec/axes/04-context-propagation.md`
- `docs/projects/orpc-ingest-workflows-spec/axes/05-errors-observability.md`
- `docs/projects/orpc-ingest-workflows-spec/axes/06-middleware.md`
- `docs/projects/orpc-ingest-workflows-spec/_phase-e-runtime-execution-pass-01-2026-02-21/E4_DISPOSITION.md`
- `docs/projects/orpc-ingest-workflows-spec/_phase-e-runtime-execution-pass-01-2026-02-21/E4_TRIGGER_EVIDENCE.md` (conditional)

## Exit Conditions
1. `E1..E4` complete with green gates.
2. `E5` review closure approved.
3. `E5A` structural disposition closed.
4. `E6` cleanup manifest complete.
5. `E7` readiness published.
