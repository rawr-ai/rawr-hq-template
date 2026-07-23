# Agent Plugin Lifecycle Service Router

## Scope

- Applies to `services/agent-plugin-lifecycle/**`.
- This oRPC service owns the curated agent-plugin capability boundary across
  release inputs, vendors, packaging, native-provider convergence, and
  current-main governance.

## Boundaries

- Consumers cross through declared package exports; `src/service/**` remains
  owned by this package.
- The service decides lifecycle policy from content-workspace facts and
  delegates filesystem and native-provider mechanics through resource
  contracts.
- It does not own the Oclif installation, Personal repository contents, app
  composition, or provider-home state. Native provider inventory is the live
  installed-state authority.

## Flow

- A host supplies the content-workspace, package-output, and native-provider
  resources; root middleware narrows context; the owning module validates and
  executes one lifecycle capability; the public router returns its result.

## Routing

- [Repository router](../../AGENTS.md)
- [Public service contract](src/service/contract.ts)
- [Service dependency boundary](src/service/base.ts)
- [Native-provider host types](src/host.ts)

## Validation

- Run `bunx nx run @rawr/agent-plugin-lifecycle:lint` and
  `bunx nx run @rawr/agent-plugin-lifecycle:typecheck`.
- Run `bunx nx run @rawr/agent-plugin-lifecycle:test` when lifecycle behavior
  changes.
