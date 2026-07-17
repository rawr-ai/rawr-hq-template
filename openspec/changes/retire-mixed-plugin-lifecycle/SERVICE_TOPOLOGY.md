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

### Isometric Structural Axes

The latest Magic Migration `collect` topology is implementation evidence for the next tighter service shape, not a second product design. C5 adopts only the axes already earned by this lifecycle domain:

- Magic Migration evidence was inspected at `c7fefd0ad2dbfb72d92b8b3874c9f3ca0681a132` under `collect-ingest/services/collect/src/service/**`; the active Civ7 positive-topology examples were inspected at `7c8b454e98fba224854a4bdfbf348ba7bfe8702e`. These snapshots inform enforcement mechanics only.
- `RAWR_Service_Package_Effect_Spec.md` was unavailable as a dataless iCloud placeholder during C5, so no C5 behavior or structural claim depends on it.

- module-local domain matter is positively closed under `modules/<module>/model/{dto,policy,...}` as categories become populated;
- cross-module release matter remains under the existing `shared/release` owner rather than being copied into module peers;
- concrete capability code lives under `resources/<capability>/providers/<provider>`, never in the service model or CLI projection;
- only populated model categories are admitted, so the closed topology never claims authority before a capability exists;
- no `db` sibling is created in C5. A database root is admitted only with real persistence and, in the same reviewed transition, a closed `db/{schema,migrations,repositories}` topology.

The broader isometric service-package conversion remains a tracked next ratchet if it is not required to finish C5. It must preserve this service's public behavior and may not reopen app composition, the future runtime compiler, or a second lifecycle owner. The intended direction is consistent with [[docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec#4.1 Ownership law]] and [[docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec#13. Resource, provider, and profile model]].

## Context And Runtime Lanes

- **Construction `deps`:** abstract runtime/resource ports for explicit Git-object reads, immutable artifacts, package output, export destinations, native providers, governed hosted evidence, and a write-only controller-supplied `UndoWriter`, plus required observability and analytics bindings. The service declares and consumes these capabilities; it does not provision or release them. The service has no capsule store, read, clear, or replay capability.
- **Construction `scope`:** verified installed-controller and controller-data identities only. Content workspaces, provider homes, destinations, and outputs are not ambient scope.
- **Construction `config`:** stable protocol configuration only; never cwd, PATH, a personal checkout, or a provider home.
- **Invocation:** trace and command invocation identity.
- **Procedure input:** explicit absolute content workspace, provider home, destination/output, landed ref, or canonical artifact/channel handle whenever that value selects semantic authority.
- **Controller projection binding:** explicit validated absolute Git/provider executable paths construct the concrete ports for the command; PATH, cwd, personal files, and content-workspace code never select them.

Concrete Git, filesystem, archive, native-provider, and hosted-governance implementations live under capability-oriented `resources/<capability>/providers/<provider>` projects. The CLI projection owns only explicit provider selection, controller-authority preflight, binding those provisioned capabilities to the service's public ports, and one typed client invocation. It does not implement resource behavior, import module applications or repositories, or sequence a second service. The controller-owned undo application remains outside the service and is projected only by `rawr agent plugins undo`; the lifecycle service can contribute inverse actions only through its injected closed `UndoWriter` protocol.

Resource operations and provider acquisition use Effect and Effect Platform inside the resource/provider boundary. The lifecycle service itself remains on the existing `@rawr/hq-sdk` oRPC primitive for C5; it does not adopt raw effect-oRPC wiring or manufacture the future runtime compiler, bootgraph, app profile, or managed process runtime. The CLI's temporary direct binding is an attachment point for, not an implementation of, [[docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec#13. Resource, provider, and profile model]].

The stable ownership frame comes from [[docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec#4.1 Ownership law]]: services own semantic truth, resources declare provisionable capability contracts, providers implement them, and Oclif owns command execution only after the controller projection binds the selected capabilities.

## Manifest Delta

1. Add one private `@rawr/agent-plugin-lifecycle` service manifest with `@rawr/hq-sdk`, the repository-admitted oRPC/typebox lane, and only support dependencies required by its internal modules.
2. Delete the five peer service manifests and Nx identities: `@rawr/agent-plugin-build`, `@rawr/agent-plugin-export`, `@rawr/agent-plugin-packaging`, `@rawr/agent-plugin-promotion`, and `@rawr/agent-provider-deployment`.
3. Collapse CLI and root task dependencies, Vitest projects, lock data, architecture inventories, and structural gates onto the one service.
4. Absorb `@rawr/agent-plugin-release` schemas, canonicalization, and invariants into service-owned shared release types, then delete the support package and every bypass import.
5. Replace direct CLI imports of peer-service applications with one typed service client and explicit runtime binding. Preserve qualified controller undo as a separate controller-owned application.
6. Move concrete capability implementations out of the CLI tree into resource/provider projects. Keep CLI code to authority validation, provider selection, binding, rendering, and exit classification.

## Invariants And Falsifiers

- One service identity owns the curated lifecycle semantic contract; internal state repositories do not become peer services.
- Every service-backed lifecycle transition calls one typed procedure. `create` remains C4 source authoring and `undo` remains the controller-owned capsule application.
- Provider and export state remain disjoint and explicit even though their procedures share a service boundary.
- Valid read-only and converged results perform zero writes.
- No personal executable source, repository ancestry, app composition, web mounting, runtime compiler, or compatibility aggregate enters the service.
- Any surviving peer-service or release-support package/import, CLI direct module-application import, CLI-owned resource implementation, exported internal adapter, service-owned undo store/replay, ambient authority locator, or full runtime-realization expansion falsifies this correction.

## Proof

[[HABITAT_INTEGRATION]] is the structural execution record. Exactly three locked, positive rules narrow the admitted topology:

1. `require_agent_plugin_lifecycle_service_topology` closes the lifecycle to one service shell, the exact six-module inventory, uniform module roots, and only the populated model categories the domain has earned.
2. `require_agent_plugin_command_channel_topology` closes curated lifecycle commands under `rawr agent plugins` and external Oclif extension commands under `rawr plugins`.
3. `preserve_agent_plugin_lifecycle_dependency_direction` enforces controller composition through public service ports to resource contracts, rejecting service imports of concrete providers and CLI imports of service internals.

The rules assert the surviving topology rather than naming retired identities. No product test or hand-written script duplicates this structural policy. Module behavior tests retain the C2/C3 transition, failure, state-owner, same-ID replacement, and omission oracles. Command tests add parser rejection, one-procedure dispatch, status exits, and mutation-port traps. Installed-controller acceptance uses an absolute immutable binary and disposable content, provider, export, output, and controller-data homes. It proves the exact 13 curated and 7 external command IDs across 113 fresh processes while leaving native Codex operational database bytes and bootstrap removal outside its claim.
