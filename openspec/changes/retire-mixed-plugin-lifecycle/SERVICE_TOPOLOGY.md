# Agent Plugin Lifecycle Service Topology

## Intent

C2 and C3 split one domain capability across five peer service packages. That was a categorical modeling error: state authority was mistaken for service authority. Artifact storage, export ledgers, provider homes, package outputs, and governance records require distinct state owners, but they participate in one curated agent-plugin lifecycle and do not warrant five semantic service boundaries.

C5 corrects the structure before adding public command reachability. Template owns one transport-neutral oRPC service, `@rawr/agent-plugin-lifecycle`, with internal modules. The CLI is a projection and runtime binding for that service. Personal remains an explicit versioned content and record workspace, never an executable dependency.

## Domain Capability Set

The service owns the semantic lifecycle of a curated agent plugin from an explicit versioned content input through immutable release and governed distribution:

1. Verify content and construct or resolve immutable releases and release sets.
2. Observe or author declared vendor-source updates as reviewable repository changes.
3. Render deterministic packages from immutable artifacts.
4. Plan, apply, inspect, and invert managed exports at explicit destinations.
5. Test, synchronize, inspect, and retire native provider projections at explicit homes.
6. Validate governed records, resolve channels, and attest promotion authority.

`rawr agent plugins create` remains the C4 source-authoring command. It is not a transition in this lifecycle service and does not recreate any retired aggregate.

## Logical Flow

```text
explicit content workspace
  -> releases.check/build -> immutable artifact repository
  -> vendors.status/update -> reviewable source and provenance changes only

immutable artifact
  -> packaging.package
  -> exports.plan/apply/status
  -> providers.test targeted/complete

governed records + immutable artifact
  -> governance.validate/attest/resolve-channel
  -> providers.sync/status/retire

provider/export inverse action
  -> controller-owned capsule
  -> qualified controller undo application
```

Internal modules preserve these roles without becoming separate service identities:

| Module | Semantic responsibility | State boundary |
| --- | --- | --- |
| `releases` | content verification, release construction, artifact publication, lookup, verification, retention | immutable artifact repository |
| `vendors` | declared upstream observation and reviewable vendor update | explicit content repository records |
| `packaging` | deterministic package rendering and guarded output | explicit package output |
| `exports` | managed export planning, application, inspection, and inverse capture | one ledger per export destination |
| `providers` | targeted/complete testing and native sync/status/retire | each explicit provider home |
| `governance` | acceptance validation, channel resolution, promotion attestation | repository-governed records and read-only hosted evidence |

## Service Shape

The implementation follows the enforced `services/session-intelligence` topology:

```text
services/agent-plugin-lifecycle/
  package.json
  tsconfig.json
  tsconfig.build.json
  vitest.config.ts
  src/
    index.ts
    client.ts
    router.ts
    types.ts
    service/
      base.ts
      contract.ts
      impl.ts
      router.ts
      middleware/
        analytics.ts
        observability.ts
      common/
        README.md
        errors.ts
        entities.ts
      modules/
        releases/
        vendors/
        packaging/
        exports/
        providers/
        governance/
      shared/
        release/
  test/
    modules/
    shared/
```

Each module owns its schemas, contract, module middleware, repository interfaces, router, and private implementation. Code stays module-local unless at least two modules share the same semantic type or port. The package root exports only `createClient`, client boundary types, and the router. The contract and any deliberately public types, ports, or entities use exact named subpath exports. Internal repositories and adapters are not exported.

## Context And Runtime Lanes

- **Construction `deps`:** abstract runtime/resource ports for explicit Git-object reads, immutable artifacts, package output, export destinations, native providers, governed hosted evidence, and a write-only controller-supplied `UndoWriter`, plus required observability and analytics bindings. The service has no capsule store, read, clear, or replay capability.
- **Construction `scope`:** verified installed-controller and controller-data identities only. Content workspaces, provider homes, destinations, and outputs are not ambient scope.
- **Construction `config`:** stable protocol configuration only; never cwd, PATH, a personal checkout, or a provider home.
- **Invocation:** trace and command invocation identity.
- **Procedure input:** explicit absolute content workspace, provider home, destination/output, landed ref, or canonical artifact/channel handle whenever that value selects semantic authority.
- **Controller projection binding:** explicit validated absolute Git/provider executable paths construct the concrete ports for the command; PATH, cwd, personal files, and content-workspace code never select them.

Concrete Git, filesystem, archive, provider, hosted-governance, and capsule-writer adapters live in the CLI projection's service runtime binding. Service-backed commands call one typed local client procedure. They do not import module applications or repositories and do not sequence a second service. The controller-owned undo application remains outside the service and is projected only by `rawr agent plugins undo`; the lifecycle service can contribute inverse actions only through its injected closed `UndoWriter` protocol.

The repository currently has no admitted effect-oRPC provider and no Effect runtime substrate for this service. This consolidation therefore uses the existing `@rawr/hq-sdk` oRPC service primitive and does not introduce raw Effect or effect-oRPC code. Runtime realization remains owned by the dedicated final-architecture migration.

## Manifest Delta

1. Add one private `@rawr/agent-plugin-lifecycle` service manifest with `@rawr/hq-sdk`, the repository-admitted oRPC/typebox lane, and only support dependencies required by its internal modules.
2. Delete the five peer service manifests and Nx identities: `@rawr/agent-plugin-build`, `@rawr/agent-plugin-export`, `@rawr/agent-plugin-packaging`, `@rawr/agent-plugin-promotion`, and `@rawr/agent-provider-deployment`.
3. Collapse CLI and root task dependencies, Vitest projects, lock data, architecture inventories, and structural gates onto the one service.
4. Absorb `@rawr/agent-plugin-release` schemas, canonicalization, and invariants into service-owned shared release types, then delete the support package and every bypass import.
5. Replace direct CLI imports of peer-service applications with one typed service client and explicit runtime binding. Preserve qualified controller undo as a separate controller-owned application.

## Invariants And Falsifiers

- One service identity owns the curated lifecycle semantic contract; internal state repositories do not become peer services.
- Every service-backed lifecycle transition calls one typed procedure. `create` remains C4 source authoring and `undo` remains the controller-owned capsule application.
- Provider and export state remain disjoint and explicit even though their procedures share a service boundary.
- Valid read-only and converged results perform zero writes.
- No personal executable source, repository ancestry, app composition, web mounting, runtime compiler, or compatibility aggregate enters the service.
- Any surviving peer-service or release-support package/import, CLI direct module-application import, exported internal adapter, service-owned undo store/replay, ambient authority locator, or Effect/runtime realization work falsifies this correction.

## Proof

Habitat is the structural authority. The top-level `orpc-service-package` blueprint enforces the canonical service shell, exact six-module inventory, module-root files, and typed runtime boundary. The RAWR lifecycle niche rejects retired peer projects and compatibility command roots. A Grit packet rejects concrete mutation authority inside the service, retired package imports, and CLI bypasses into service internals. No product test or hand-written script duplicates that structure policy. Module behavior tests retain the C2/C3 state-transition and failure oracles. Command tests add parser rejection, procedure dispatch, status exits, and mutation-port traps. The installed-controller acceptance uses an absolute binary and disposable content, provider, export, output, and controller-data homes.
