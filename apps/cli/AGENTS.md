# CLI Router (`@rawr/cli`)

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

## Flow

- `src/index.ts` or `bin/run.js` starts Oclif and discovers `src/commands/**` or
  its compiled equivalent.
- A command parses input, creates its explicit package or service binding,
  invokes the operation, and renders the returned result.
- Shared command construction and binding code lives under `src/lib/**`; it
  does not become a second domain implementation.

## Routing

- [Apps router](../AGENTS.md)
- [Core command primitives](../../packages/core/AGENTS.md)
- [Agent-plugin lifecycle service](../../services/agent-plugin-lifecycle/AGENTS.md)

## Validation

- `bunx nx run @rawr/cli:lint`
- `bunx nx run @rawr/cli:typecheck`
- `bunx nx run @rawr/cli:test`
- `bunx nx run @rawr/cli:acceptance:oclif`
- `bunx nx run @rawr/cli:acceptance:oclif-native-plugins` when native extension
  installation behavior changes
