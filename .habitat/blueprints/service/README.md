# Service

`service@1` is Habitat's closed, contract-first oRPC service kind. It owns a
cohesive runtime capability and its domain invariants. It does not own transport
projection, host startup, long-running orchestration, or provider selection;
plugins and applications own those concerns.

## Capability Flow

```text
authorship: contract -> implementation -> configured service -> module -> operation
composition: operation -> module router -> root router -> public client
invocation: application -> public client -> operation -> handler
```

An application selects providers and supplies ready resources and service
clients. Another service depends only on the in-process client projected by
`src/client.ts`, never another service's contract, router, implementation, or
provider. Transport-owning plugins may consume the deliberately projected
public contract. Completed operations and routers compose upward; context,
capability, and authority narrow toward handlers. Each descent narrows
authorship scope, even when native additive context still retains upstream
values at runtime.

`base.ts` declares the complete service context through five lifetime lanes:

| Lane | Owner | Meaning |
| --- | --- | --- |
| `deps` | application | Ready external capabilities and public service clients |
| `scope` | binding | Stable domain identity |
| `config` | application | Selected service behavior |
| `invocation` | caller | Request-local facts |
| `provided` | middleware | Request-derived capabilities |

oRPC context updates merge top-level properties. Replacing a nested lane is not
a recursive merge, so middleware that returns a lane preserves every member
required below it. Every context-extending middleware descends from the single
service base exported by `base.ts`; each `module.ts` then curates the smallest
context its branch requires. Operations receive ready values; they do not
acquire providers or invoke dependency factories.

## Public And Private Faces

The project root is closed around its `AGENTS.md` context router, package
metadata, production source, and an optional package-root proof tree.
`src/client.ts` is the public in-process face.
The private `src/service` spine contains:

- `base.ts`: context declaration and optional context middleware author.
- `contract.ts`: aggregate public contract.
- `impl.ts`: one contract implementation lineage and service middleware.
- `modules/`: sealed capability branches.
- `router.ts`: aggregate router composition.

For a selected `service@1` member, the public `client.ts` face is the sole
projection path. It projects the aggregate contract for transport owners,
constructs the in-process client consumed by other services, and may expose
deliberate boundary types. Client construction privately acquires the root
router and may adapt owner-local private port types or declared failure
identities at that boundary. It exposes no router or implementation. A module
DTO or policy type crosses the boundary only through a deliberate `client.ts`
re-export, never a deep private import; another service consumes the client
rather than extracting the contract.

Each module has one `AGENTS.md`, `contract/`, `module.ts`, `router/`, and
module-root `router.ts`. Named `router/<name>.ts` leaves author operations and
their handlers. The module-root router composes those completed leaves as a
plain object; the service-root router composes module routers. Neither
composition face becomes a second logic plane.

Optional module middleware is an indexed catalog because several operation
authors may consume it. Optional service middleware is a flat set of semantic
leaves because `impl.ts` is its only assembly owner. Model facts are classified
under `dto`, `entities`, `errors`, `policy`, or `ports`, and every present kind
has one `index.ts` import face. There is no model-root barrel and no vague
fallback directory.

## Domain Ownership

- Entities carry stable domain identity and transition invariants.
- DTOs are operation or boundary projections.
- Errors name failures owned by the service or module boundary.
- Policy owns decisions and definitions.
- Ports describe capabilities supplied from outside the service.

Service-root model facts must have meaning across the whole capability. Access
alone never promotes module-owned matter to the service root. An optional
service database owns closed `migrations`, `schema`, and `stores` interiors;
external database acquisition remains a resource/provider concern, and stores
enter operation authorship through context rather than reverse imports.

## Vendor Boundary

The kind selects contract-first oRPC for Habitat services without claiming that
oRPC itself has only one valid mode. TypeBox schemas define wire structure and
generated types. Native `.handler(...)` remains valid for synchronous and
Promise-returning operations. An Effect-backed oRPC operation uses the official
`@orpc/experimental-effect` `.effect(...)` implementer extension, whose sole
production bootstrap role is `src/service/impl.ts`. The extension delegates to official `handlerGen(...)`,
which owns the request fiber, `effect/context`, `effect/wrap`, request signal,
Cause mapping, and Promise boundary; a service must not replace it with
`Effect.run*`, a custom runner, or a Habitat imitation. TypeScript module
augmentation proves that Effect-backed
operations have selected the bridge, while the module-to-implementation lineage
guarantees that the bootstrap runs before authored operations.

The application and process own construction of Effect Context, resource
lifetime, policy, telemetry, and shutdown through those native context and wrap
hooks. `ProcessExecutionRuntime` does not execute oRPC service Effects. It may
remain the execution owner for non-oRPC descriptor lanes. A generated service
whose initial operation is a plain native handler therefore does not need a
dependency on `@orpc/experimental-effect`.

The authoring model keeps the generator and operation local while binding Effect
adaptation to one exact vendor bootstrap. That simplicity preserves one
authority and closes alternate terminals: oRPC authors the procedure, Effect
authors the computation, Habitat owns the law, and TypeScript plus Grit verify
the source relationship.

## Proof And Enforcement

Optional proof lives under package-root `test/` in the closed `behavior`,
`mechanics`, `integration`, `acceptance`, and `support` categories. Production
source never owns proof files.

`structure.toml` is the positive filesystem authority. It completely defines
the project, production, service, module, model, database, and proof filesystem
topology. TypeScript proves context assignability, contract compatibility,
client types, and rejects an acquired adjacent child that is never projected.
File-local Grit proves one canonical adjacent projection at each composition
face; it does not claim total cross-file inventory reachability. Owner-local
behavior tests prove the complete callable operation set, middleware order,
validation, once-only execution, outcomes, and resource lifecycle. The root definition registers
portable Grit laws over the selected project root for the public client,
contract-property meaning, stable role declarations, ordinary adjacent binding
projection, and internal import direction. It does not replace TypeScript
data-flow analysis. Habitat acquires the package manifest and source subjects
from that selected root. The closed package export law owns the sole package
face; Nx module-boundary enforcement owns relative imports across project
roots.

The selected SDK member co-lands with the native Nx service generator and
packed-consumer construction proof. Presence in source or package bytes does
not by itself grant policy-pack membership.

See [[skill|the service capability funnel]] for the authoring frame.
