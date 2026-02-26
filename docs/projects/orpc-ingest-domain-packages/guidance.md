# Guidance

## Guidance #1 (2026-02-25)

### Question
Where should ORPC error definitions live when we need procedure-level precision?

### Guidance
Use a hybrid placement model based on actual sharing:

- Service-level errors for failures shared across modules (for example generic database/not-found surfaces).
- Module-level errors for failures shared within one module.
- Procedure-local errors for truly local behavior.

Each procedure should still declare only the errors it can throw via `.errors(...)`. Shared definitions can be reused, but declaration remains procedure-specific.
