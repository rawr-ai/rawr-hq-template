# M1 Closure Frame

Milestone 1 is complete. The repo has one coherent Phase 1 story again:

- HQ operational truth lives in `services/hq-ops`
- the live plugin tree uses the canonical role-first topology
- the HQ app shell is real and authoritative
- old executable authority is quarantined behind exactly one explicit bridge at `apps/hq/legacy-cutover.ts`
- the frozen marketplace compatibility lane is exactly `plugins/agents/hq`

The immediate follow-on is not more M1 cleanup. It is Phase 2 entry from the frozen plateau described in:

- [phase-1-current-state.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/migration/phase-1-current-state.md)
- [phase-2-entry-conditions.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/migration/phase-2-entry-conditions.md)

The key handoff invariant is:

- do not reopen settled Phase 1 authority decisions while starting Phase 2 substrate work

Context remains in good shape for continuing without a handoff.
