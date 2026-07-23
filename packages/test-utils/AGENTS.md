# Test Utilities Router (`@rawr/test-utils`)

## Scope

- Applies to process-level test helpers in `packages/test-utils/**`.

## Boundaries

- Owns reusable test harness primitives, currently the bounded `runCommand`
  process adapter and its result types.
- Must not contain product policy, production command orchestration, or
  mutable test state shared across suites.
- Bun and Node execution branches expose the same completed-command result
  contract. Each branch must reject after the requested timeout even when its
  process-termination mechanics differ.

## Flow

- A test supplies a command, arguments, and optional environment or timeout.
- The helper selects the available process runtime, captures stdout and
  stderr, and returns the normalized exit result to the owning test.

## Routing

- [Packages router](../AGENTS.md)
- [CLI application](../../apps/cli/AGENTS.md)

## Validation

- `bunx nx run @rawr/test-utils:lint`
- `bunx nx run @rawr/test-utils:typecheck`
