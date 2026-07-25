# Test Utilities Router (`@rawr/test-utils`)

## Purpose

- Offer deterministic process-level test primitives so product suites can
  exercise real commands without duplicating runtime-specific harness code.

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

## Behavior

- The harness runs a bounded child command, captures its completed observation,
  and normalizes Bun and Node differences into one test-facing result.

## Concepts

- A **completed-command result** contains exit status and captured streams. A
  **timeout** is a test contract that must terminate or reject regardless of
  the selected process runtime.

## Flow

- A test supplies a command, arguments, and optional environment or timeout.
- The helper selects the available process runtime, captures stdout and
  stderr, and returns the normalized exit result to the owning test.

## Interfaces

- Tests provide command, argument, environment, and timeout inputs; the helper
  returns a runtime-neutral process result or a timeout rejection.

## Routing

- [Packages router](../AGENTS.md)
- [CLI application](../../apps/cli/AGENTS.md)

## Validation

- `bunx nx run habitat:lint`
- `bunx nx run @rawr/test-utils:typecheck`
