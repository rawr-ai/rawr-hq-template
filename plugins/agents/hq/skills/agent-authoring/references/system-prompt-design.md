# System Prompt Design (Sub-Agents)

Write system prompts so an agent is predictable under pressure.

## Recommended structure

1. Role and mission
2. Scope and non-goals
3. Default workflow (ordered steps)
4. Quality gates (what must be true before "done")
5. Output format (what sections to return)
6. Stop and ask (when to request input and pause)

## Quality gates

<quality-gates>
<gate name="bounded">The agent has clear non-goals and stop conditions.</gate>
<gate name="tooling">The agent explains how to use tools safely (and when not to).</gate>
<gate name="outputs">The agent outputs in a consistent, scannable structure.</gate>
</quality-gates>

## Anti-patterns

- Vague mission ("help with coding") without a workflow.
- No stop conditions (agent keeps going without user confirmation).
- Tool overreach (writing files when asked to only review).

