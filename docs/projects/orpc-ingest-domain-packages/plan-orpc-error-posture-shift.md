# Plan — ORPC Error Posture Shift

Created: 2026-02-26
Status: Active execution plan

## Objective

Shift domain package error handling to an ORPC-native boundary posture:

- ORPC procedure `.errors(...)` is the canonical boundary contract.
- Router-client-only package boundary remains hard architecture.
- `neverthrow` remains available for internal composition/recovery, but is not an always-on repository contract.
- Remove `createOrpcErrorMapFromDomainCatalog` and `unwrap` patterns from active code paths.

## Constraints and Design Goals

- Domain package internals remain transport-agnostic.
- Do not add new package entry surfaces; keep one stable router/client surface.
- Keep procedure error declarations explicit and narrow.
- Prefer direct, readable mappings at the procedure boundary over extra mapping indirection.

## References

- ORPC procedure and errors model: https://orpc.dev/docs/procedure
- ORPC context/middleware model: https://orpc.dev/docs/context, https://orpc.dev/docs/middleware
- ORPC in-process router client: https://orpc.dev/docs/client/server-side

## Execution Phases

### Phase 0 — Plan + Decision Lock-In (first)

- [x] Create this plan document.
- [x] Add decision entry that locks the ORPC-native boundary posture and explicitly rejects domain-catalog-to-ORPC mapping and unwrap indirection.
- [x] Record rationale and constraints in grounding/session docs.

### Phase 1 — Guidance and Example Docs Alignment

- [x] Update `guidance.md` with neverthrow posture: optional internal tool for composition/recovery, not default repo contract.
- [x] Update `examples.md` to reflect the new error posture and remove legacy catalog/unwrap assumptions.
- [x] Ensure docs remain internally consistent with boundary + modules structure.

### Phase 2 — Refactor `packages/example-todo` First

- [x] Replace `unwrap`-based procedure error conversion with direct ORPC error throwing at procedure boundary.
- [x] Remove `createOrpcErrorMapFromDomainCatalog` usage in module and boundary errors.
- [x] Keep errors layered by responsibility:
  - domain/service/module errors for internal semantics,
  - ORPC `.errors(...)` declarations for boundary contract.
- [x] Keep/introduce selective internal `neverthrow` usage only where composition/recovery is useful.

### Phase 3 — Broader Cleanup (after example package)

- [x] Remove legacy helper exports/usages that encode domain-catalog-to-ORPC mapping (`createOrpcErrorMapFromDomainCatalog`, related catalog types/helpers) from `@rawr/orpc-standards` if no longer used.
- [x] Remove remaining unwrap interaction patterns across affected code.

### Phase 4 — Verification + Submit

- [x] Run focused package tests/typecheck/build first (`@rawr/example-todo`, `@rawr/orpc-standards`).
- [ ] Run repo-level checks required for changed surfaces.
- [ ] Commit with conventional commit message.
- [ ] Submit stack as draft via Graphite.

## Notes

- This plan is authoritative for this posture shift execution.
- If a new ambiguity appears with architectural side effects, log it immediately in the session grounding doc under Implementation Decisions.
