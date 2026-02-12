# Channel Model and Layering

## Reporter vs actor

- Reporter commands: stateless, deterministic, atomic.
- Actor commands/workflows: stateful orchestration that composes reporters and judgment.

## Execution layers

1. Workflow docs (agent-interpreted): non-deterministic SOPs.
2. Orchestration commands: deterministic entry points that trigger durable orchestration.
3. Structural commands: atomic reporters.

## Command surface invariant

- External CLI plugin channel: `rawr plugins ...`
- Workspace/runtime plugin channel: `rawr plugins web ...`

Do not mix these in the same example unless you are explicitly comparing surfaces.

