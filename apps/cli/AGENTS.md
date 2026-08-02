# CLI Router (`@habitat-ai/rawr`)

## Purpose

- Give operators a stable Oclif command surface for invoking RAWR capabilities
  without moving domain policy into command classes.

## Scope

- Applies to the Oclif application in `apps/cli/**`.
- Owns command discovery, command-line parsing, projection bindings, and
  operator-facing rendering.

## Boundaries

- `rawr plugins ...` is the native Oclif extension surface.
- `rawr agent plugins ...` is the curated agent-plugin lifecycle surface.
- Command classes stay thin: lifecycle policy belongs to its service and
  concrete filesystem or provider behavior belongs to the bound resource.
- Development and packaged execution must discover the same package-owned
  command tree; neither may load commands from a content checkout.

## Behavior

- Each service-backed domain command admits and normalizes operator input,
  invokes exactly one owning capability through an explicit binding, and
  renders its structured result or declared failure.
- An orchestration command may sequence named operations, but it must preserve
  each operation's existing contract and owner rather than absorb their policy.

## Concepts

- The **command tree** is Oclif's discoverable operator namespace. A
  **projection binding** connects that namespace to a package or service
  contract without becoming a second implementation.

## Flow

- `src/index.ts` or `bin/run.js` starts Oclif and discovers `src/commands/**` or
  its compiled equivalent.
- A command parses input, creates its explicit package or service binding,
  invokes the operation, and renders the returned result.
- Shared command construction and binding code lives under `src/lib/**`; it
  does not become a second domain implementation.

## Interfaces

- Oclif owns argv parsing and command discovery; package and service contracts
  own operation semantics; resource bindings supply concrete host mechanics;
  renderers translate returned results for the terminal.

## Routing

- [Apps router](../AGENTS.md)
- [Core command primitives](../../packages/core/AGENTS.md)
- [Agent-plugin lifecycle service](../../services/agent-plugin-lifecycle/AGENTS.md)

## Validation

- `bunx nx run habitat:lint`
- `bunx nx run @habitat-ai/rawr:typecheck`
- `bunx nx run @habitat-ai/rawr:test`
- `bunx nx run @habitat-ai/rawr:acceptance:oclif`
- `bunx nx run @habitat-ai/rawr:acceptance:oclif-installed-package` when installed
  package behavior or the public CLI release closure changes
- `bunx nx run @habitat-ai/rawr:acceptance:oclif-native-plugins` when native extension
  installation behavior changes
