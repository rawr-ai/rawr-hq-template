# Advanced Command Patterns

## Arguments

- Use `$ARGUMENTS` when you want a single freeform string.
- Use `$1`, `$2`, ... when the interface is stable and ordered.

Guardrail: if required arguments are missing, ask the user and stop.

## File references (`@...`)

- Use `@path/to/file` when you know exact files that must be in context.
- Use `@$1` when the user supplies a file path argument.

## Bash captures (`!` backticks)

Use sparingly for fast, read-only context:

- git status/branch/diff listing
- listing candidate files or directories

Avoid side effects in captures (no deletes, no writes).

## Portability (`${CLAUDE_PLUGIN_ROOT}`)

When writing commands shipped inside a Claude plugin, prefer `${CLAUDE_PLUGIN_ROOT}` for plugin-local script paths.

## Interactive choices and confirmation

If a decision materially affects outcome, add a confirmation checkpoint:

- present options and tradeoffs
- ask for explicit confirmation
- stop until the user answers

