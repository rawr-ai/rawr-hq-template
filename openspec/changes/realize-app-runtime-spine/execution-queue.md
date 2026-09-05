# Runtime Execution Queue

This is present execution state, not an append-only receipt log.
[Tasks](tasks.md) are the native OpenSpec apply obligations;
[design](design.md) and the canonical runtime hold the decisions.
This queue does not select work in another task.

## Current State

Realignment preparation is admitted through PR 1007 and exact-main Repository
Ratchet at `80c19fc1291515acbf21e88c97385d5e29d74341`. The owner has authorized
resumed implementation with iterative research and independent steward review.
The [implementation record](../../../docs/projects/habitat-runtime-realignment/IMPLEMENTATION.md)
holds the current frame, team, findings and proof. **0.1: correct the cold
semantic pipeline** and **0.2: simplify trusted boot admission** are implemented,
independently reviewed and locally accepted, including full repository CI and
installed SDK/CLI acceptance. Cold predecessor PR 1008 also passed required CI
and Linux/Windows installed acceptance. Its child now implements **7.1-7.5:
native acquisition**, including native Effect values, selected preflight,
rollback, independent file leases and the qualified telemetry provider through
real compilation/provisioning. Independent reviews, full repository CI and all
nine macOS installed tests pass, including the optional root-helper law refusal.
Task 7 also passed required and Linux/Windows installed CI in PR 1009. Tasks
8/9 now implement bounded access, native service binding and process execution
on its child: full repository CI, all nine macOS installed tests, source/graph
acceptance and independent final review pass. This complete three-story stack
still awaits native Graphite merge. No candidate is claimed merged or released.

Opening main has schema, definition, derivation, compiler and bootgraph owners.
It has no live Effect provisioning, process binding, generic harness owner,
observation owner or mounting owner. Its baseline cold code/tests embody the
previous target in named-instance mapping, profile coverage, constructor
handoff, compiler normalization and Proxy admission. The Unicode and DAG work
defects also existed at that baseline. The current isolated candidate repairs
those cold-pipeline gaps with composed review, bootgraph and packed SDK checks.
It is not yet merged or released.

Released 0.5.15 provides foundation/service law. Current main's added runtime
faces have not thereby been published. Installed local candidate proof,
public release and consumer acceptance remain separate states.

## Current Boundary

Complete stack admission, then implement task 10's cold adapter lowering and
real agent-tool/desktop-background authoring before harness/mounting/observation.
The verified binding story uses official oRPC beta.32 native clients and Effect
beta.101, preserving actual request and stream settlement before resource
release. No community bridge, replacement interpreter or second service runner
is present. Native hosts, collector storage/query and async durability retain
their later native gates. Do not restore held source or edit a consumer.

## Dependency Order

| Container | Prerequisites | Completion Proof |
| --- | --- | --- |
| 0.1 cold pipeline correction | Admitted realignment | Nonempty cold handoff and all new counterexamples |
| 0.2 boot trust simplification | Corrected compiler output | Preserved structure/order/reference/coldness behavior |
| 7.1-7.5 native acquisition | Corrected cold plans and ordering | Real Effect lifecycle, preflight and rollback |
| 8.1-9.2 service binding/execution | Ready resources and exact service refs | Actual native callable, cache/invocation and stop refusal |
| 10.1-10.7 harness/mounting/observation | Compiled surfaces and process runtime | Native ownership, complete handoffs and finalization |
| 11.1-11.8 Habitat Oclif | Generic lifecycle/mounting | Real built and installed foundation commands |
| 12.1-12.3 qualified CLI verticals | Oclif vertical and each selected capability | Installed behavior/telemetry/generator receipts |
| 13.1-13.5 server/async | Generic lifecycle/mounting; conforming app fixture | Real Elysia/oRPC/Inngest and independent same-app children |
| 13.6 companion condition | Generic public harness contract; independent artifact | Qualified attachment or explicit unsatisfied condition |
| 14.1-14.2 web | Generic web lowering/mount contract | Real build/native mount, no unselected browser runtime |
| 15.1-15.7 release | Applicable owner/native/installed proofs | Exact-main accepted SDK/CLI and truthful handoffs |
| 15.8-15.9 disposition/archive | Active obligations satisfied; durable independent transfers | No lost obligations or forced held-source cleanup |

Within a container, checklist items may co-land when they are inseparable from
one conforming story. Shared owners serialize conflicting edits; distinct
native-host acceptance can proceed independently once prerequisites exist.
Cross-cutting owner law/schema/cache/router obligations are acceptance conditions,
not a second earlier serial queue.

## Independent Work

Before affected SDK authoring work (8.3, 10.1, server/async and web), apply the
owner's [SDK authorship investigation input](../../../docs/projects/habitat-runtime-realignment/IMPLEMENTATION.md#sdk-authorship-investigation-input).
It requires locating and assessing the Documents/Projects/RAWR "SDK design
update" and prior incorporation, native-provider anchoring, and bounded semantic
ablation under requisite variety. It is future design input, not new authority
or a blocker to the current cold repair.

Ledger D-1, inquiry D-2, later Rawr adoption/retirement D-3 and native
agent/desktop host integration D-4 are in
[deferred-capabilities](deferred-capabilities.md). Their original obligations are
unimplemented, not checked off. Generic runtime needs none of the external
Fluree qualification artifacts. Do not infer authority to create or maintain
such an artifact from the prior agent-recorded direction.

Agent/desktop authoring and executable/schema faces remain required in 10.1;
web-local executable authoring remains required in 14.1/14.2. Their real
process-owned execution proof is distinct from D-4 native host qualification.
Do not defer those interfaces or publish empty shells to satisfy an export map.

Persisted observability integrations and deployment tooling remain Habitat
initiative outcomes beyond this runtime-spine change. This change supplies
process identity, lifecycle observations, cold handoff and independently
launchable processes; it does not implement a telemetry backend, hosted
deployment orchestrator or production consumer rollout.

## Consumer Checkpoints

| Consumer | Available Now | Actual Next Acceptance |
| --- | --- | --- |
| Civ7 | Released foundation service law in 0.5.15 | Consumer-owned native migration, policy and V8-isolate compatibility; no full-runtime gate for that step |
| Magic | Its native API/async/MCP prototype and staging work | Product staging/behavior acceptance remains independent; Habitat adoption waits for needed released runtime |
| Rawr initial services/topics | Accepted finite independent imports | Native migration to needed released interfaces plus product-owned runtime behavior |
| Rawr workstream | Held ledger-dependent product source | Qualified ledger release, then destination-owned adoption; do not import mixed stack wholesale |

## Verification And Claim Rules

Every source-bearing story runs its focused behavior/types/policy/build and
real boundary acceptance, then repository checks and required CI through Graphite.
Run optional cumulative product-separation and installed-package acceptance when
their inventories/authority change; ordinary broad check is not their substitute.
Vendor boundary changes require current pinned-source reading and actual native
proof. Publication requires exact-main accepted artifacts.

The [obligation disposition](obligation-disposition.md) maps all inherited task
ids. Existing JSON receipts retain their exact historical values; snapshots live
behind the [quarantine ledger](../../../docs/projects/habitat-runtime-realignment/quarantine/AGENTS.md).
No task count, old sole-active sentence or dated exact-main receipt grants
current implementation or external-mutation authority.
