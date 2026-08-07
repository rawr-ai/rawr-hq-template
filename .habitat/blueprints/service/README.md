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
capability, and authority narrow toward handlers. Each descent removes
knowledge.

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
rather than extracting the contract. Predecessor services are not claimed to
conform until they migrate into the selected kind.

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
alone never promotes module-owned matter to the service root. Bare `service@1`
admits no persistence interior. A database subtree belongs to an independently
selected database kind; its stores enter operation authorship through context
rather than reverse imports.

## Vendor Boundary

The kind selects contract-first oRPC for Habitat services without claiming that
oRPC itself has only one valid mode. TypeBox schemas define wire structure and
generated types. Effect execution is admitted through the selected runtime
adapter; the structural kind does not require a per-service prototype extension
or a second Effect terminal.

## Proof And Enforcement

Optional proof lives under package-root `test/` in the closed `behavior`,
`mechanics`, `integration`, `acceptance`, and `support` categories. Production
source never owns proof files.

`structure.toml` is the positive filesystem authority. It states the complete
allowed topology, so alternate cabinets and compatibility shapes have no place
to exist. TypeScript proves context assignability, contract completeness, and
client types. Owner-local behavior tests prove middleware order, validation,
once-only execution, outcomes, and resource lifecycle. The root definition
registers no path-qualified or product-qualified source packet; the repository's
predecessor service packets stay live only until portable source rules replace
them atomically with pack admission.

The definition remains unselected until the SDK and CLI co-land those source
rules, its native Nx generator, and packed-consumer construction proof. Presence
in source or package bytes does not by itself grant policy-pack membership.

See [[skill|the service capability funnel]] for the authoring frame.
