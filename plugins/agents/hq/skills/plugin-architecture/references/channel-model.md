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
- Curated agent-plugin lifecycle channel: `rawr agent plugins ...`
- App composition and runtime realization own neither lifecycle channel.

Do not route runtime membership through a plugin lifecycle command or use the retired web-membership command family as a fallback.
