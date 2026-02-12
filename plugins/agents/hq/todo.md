# Deferred Work

This slice intentionally defers non-executable architecture items.

- Create `packages/plugin-workflows` for durable orchestration logic.
- Add actor commands to HQ plugin:
  - `rawr plugins improve`
  - `rawr plugins sweep`
  - `rawr plugins publish`
- Wire deferred actor workflows into the Inngest worker runtime.
- Add workflow docs for deferred actor paths once command/runtime wiring exists.

