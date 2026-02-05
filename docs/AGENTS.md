# Docs

## TOC
- [Scope](#scope)
- [Canonical Docs](#canonical-docs)
- [Directory Map](#directory-map)
- [Conventions](#conventions)

## Scope
- Applies to `docs/**`.
- Prefer linking to canonical docs over duplicating them in new files.

## Canonical Docs
- `docs/PLAN.md`: single source of truth for RAWR v1 architecture + runbook.
- `docs/SECURITY_MODEL.md`: security posture + gating boundary + reports.
- `docs/process/GRAPHITE.md`: Graphite workflow invariants and quick commands.
- `docs/process/AGENT_LOOPS.md`: canonical hardened loops for end-to-end agent delivery.
- `docs/FUTURE_RENAME.md` and `docs/FUTURE_MARKETPLACE.md`: explicitly parked future topics.

## Directory Map
- `docs/process/`: workflows and contribution process (Graphite, etc.).
- `docs/plans/`: deeper execution plans (phase work, hardening plans).
- `docs/spikes/`: investigations/spikes (may be parked or exploratory).
- `docs/scratchpads/`: ephemeral working notes per agent/initiative (non-canonical).

## Conventions
- If implementation choices diverge, update `docs/PLAN.md` to prevent drift.
- Treat “parked” items as doc-only until explicitly un-parked (e.g., LLM judge / marketplace).
- Keep scratchpads lightweight and disposable; don’t route long-term truth through them.
