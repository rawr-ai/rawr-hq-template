# Axis 11: Core Infrastructure Packaging and Composition Guarantees

## Canonical Core Reference
- Canonical subsystem policy and global invariants: [ARCHITECTURE.md](../ARCHITECTURE.md).
- Architecture-level decision authority: [DECISIONS.md](../DECISIONS.md).
- This axis is canonical policy language for D-014 and does not override locked D-005..D-012 semantics.

## In Scope
- Deterministic layering contract for shared infrastructure primitives and composition seams.
- Host-vs-plugin-vs-package ownership guarantees for auth/db-ready stubs/hooks.
- Import-direction and wiring determinism guarantees that reduce plugin author burden.

## Out of Scope
- Full auth implementation design.
- Full DB implementation/transaction design.
- Process/runbook/testing document changes outside this packet.

## Canonical Policy
1. Shared infrastructure primitives MUST be package-oriented by default and expressed as transport-neutral contracts (ports/interfaces/types/helpers) in package-layer modules.
2. Concrete auth/db/runtime adapter construction MUST remain host composition owned.
3. Package and plugin modules MUST consume infrastructure through injected context ports, not process-global singleton bootstraps.
4. Workflow/API boundary contracts remain plugin-owned (D-006 unchanged); this axis adds composition guarantees only.
5. Internal package clients remain the default server-internal call path (axis-02 posture unchanged).
6. Host composition MUST expose explicit context factory seams for boundary and workflow mounts.
7. Import direction MUST remain deterministic: shared infrastructure packages -> capability packages -> plugins -> host composition; reverse imports are forbidden for runtime wiring.
8. Manifest-first composition remains canonical: host wiring consumes generated manifest surfaces and mount order remains explicit (D-005, D-008 unchanged).
9. Infrastructure ports SHOULD be small and capability-oriented (principal resolution, metadata, auth check facade, db/work-unit facade, runtime persistence facade).
10. This axis specifies stubs/hooks and guarantees only; full provider-specific auth/db flows remain deferred.
11. This axis does not force one concrete package topology beyond the ownership and import-direction guarantees defined here.

## Deterministic Layer Model
| Layer | Canonical responsibility | Examples | Forbidden ownership |
| --- | --- | --- | --- |
| Shared infrastructure package layer | define reusable ports/contracts + pure helpers | context metadata types, `AuthPort`, `DbPort`, resolver helpers | boundary route contracts, host route mounting |
| Capability package layer | domain/service/procedures/internal clients consuming injected ports | `packages/<domain>/src/context.ts`, `client.ts`, `service/*` | plugin boundary ownership, host adapter bootstrapping |
| Boundary plugin layer | caller-facing contract + procedure/router composition (direct router handlers or `operations/*` modules) | `plugins/api/*/contract.ts`, `plugins/workflows/*/router.ts` | concrete auth/db adapter construction, host mount ownership |
| Host composition layer | concrete adapter assembly + context factories + mount order | `rawr.hq.ts`, `apps/server/src/rawr.ts`, `apps/server/src/workflows/context.ts` | package-domain behavior ownership |

## Composition Guarantees
1. Plugin authors implement contracts and boundary procedures (direct router handlers or `operations/*` modules) and declare required context ports; they do not design infrastructure bootstrapping.
2. Host owners wire concrete adapters once and inject them into boundary contexts and package clients.
3. Capability packages stay reusable across API/workflow/durable paths because dependencies are injected through typed ports.
4. Boundary/runtime split remains explicit: caller-facing routes consume boundary context factories, while runtime ingress/durable execution consumes runtime-owned adapters.
5. Auth/db infrastructure can evolve without forcing boundary contract rewrites when port contracts remain stable.

## Import-Direction Matrix
| From | May import | Must not import |
| --- | --- | --- |
| Shared infrastructure packages | other shared packages (pure utility only) | plugins, host runtime modules |
| Capability packages | shared infrastructure packages | plugins, host runtime modules |
| Plugins (`api`, `workflows`, `web`) | capability packages, shared infrastructure packages | host runtime modules for adapter bootstrapping |
| Host composition | plugins, capability packages, shared infrastructure packages | none (host is terminal composition owner) |

## Minimal Plugin Author Wiring Contract
1. Declare boundary contracts in plugin `contract.ts`, and implement boundary procedures either directly in `router.ts` or in `operations/*` modules (`operations/*` remains the canonical default for larger mapping logic).
2. Declare required context ports in plugin `context.ts` (principal/request/runtime/auth/db-ready facades as needed).
3. Consume package internal clients via injected context, not HTTP self-calls for server-internal paths.
4. Rely on host composition for concrete adapter provisioning.
5. Keep workflow trigger/status I/O schema ownership at workflow boundary contracts (D-006, D-011, D-012 unchanged).

## What Changes vs Unchanged
- **Changes:** This axis introduces explicit packaging/composition guarantees and import-direction rules for shared infrastructure seams, mapped as D-014 language.
- **Unchanged:** D-005 route split semantics, D-006 plugin-owned boundary contracts, D-007 caller/publication boundaries, D-008 bootstrap order, D-011 context/schema ownership, and D-012 inline-I/O defaults remain unchanged.

## References
- Internal client defaults: [02-internal-clients.md](./02-internal-clients.md)
- Host composition determinants: [07-host-composition.md](./07-host-composition.md)
- Workflow/API boundary seam rules: [08-workflow-api-boundaries.md](./08-workflow-api-boundaries.md)
- Runtime/context split: [04-context-propagation.md](./04-context-propagation.md)
