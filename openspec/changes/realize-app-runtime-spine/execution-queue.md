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
acceptance and independent final review pass. The admitted-continuation repair
at `214eeffba` also passes required and Linux/Windows installed CI in PR 1010.
Task 10.1 is now independently reviewed and locally accepted on its child:
full repository CI, installed SDK behavior/types and native adapter-law proof
pass. PR 1011 also passes required and Linux/Windows installed checks.
Tasks 10.2-10.4 now pass independent review, full repository CI, the real
loopback HTTP handoff proof and all nine installed SDK/CLI tests on their child.
Graphite has merged PRs 1008-1011; exact main
`57557acfb6a3f94e05195d541c3be1677f121cbe` passes Repository Ratchet 33950917970.
Handoff PR 1012 remains a submitted child; task 10.5 in PR 1013 is independently reviewed
and locally accepted on its child, including full CI, installed SDK/CLI and
native law acceptance. Tasks 10.6/10.7 are now independently reviewed and locally
accepted: real terminal startup, native stop-before-release and observation;
full CI (143 tasks), all nine installed tests and uncached native law acceptance
(12 tests, 94 assertions) pass.
Tasks 11.1-11.5, 11.7 and 11.8 are now locally accepted on the Oclif self-host
child: all retained commands and Nx readers use one explicit process lifecycle;
full CI passes 157 tasks, all nine installed tests pass, and the built/installed
native matrix proves execution, observations, output and cleanup. The separate
native extension lifecycle passes with one candidate SDK module realm.
Task 11.6 is locally accepted in PR 1016: both packed native generators, all
80 focused tests, generated native command dispatch, independently installed
extension build/tests and full 157-task repository CI pass. Task 12.3 is locally
accepted: both installed authoring commands share those generators, with exact
parity, refusal, convergence and cancellation-before-settlement proofs. Full
repository CI passes 162 tasks and all nine installed tests pass after repair.
No package release or consumer acceptance is claimed.

Opening main has schema, definition, derivation, compiler and bootgraph owners.
It has no live Effect provisioning, process binding, generic harness owner,
observation owner or mounting owner. Its baseline cold code/tests embody the
previous target in named-instance mapping, profile coverage, constructor
handoff, compiler normalization and Proxy admission. The Unicode and DAG work
defects also existed at that baseline. The current isolated candidate repairs
those cold-pipeline gaps with composed review, bootgraph and packed SDK checks.
Those corrections are now merged; they are not yet published as a package release.

Released 0.5.15 provides foundation/service law. Current main's added runtime
faces have not thereby been published. Installed local candidate proof,
public release and consumer acceptance remain separate states.

## Current Boundary

Tasks 10.2-10.7, Oclif self-host, qualified generators and task 12.3's installed
authoring commands are merged through PRs 1012-1017. Each candidate passed
required and Linux/Windows installed checks; the final authoring repair only
corrected two integration-test budgets without changing runtime behavior.
Graphite completed the one native stack merge at main
`c954d04cb67280cff51d5f71a8d154d6b8410473`. Tasks 13.1/13.2 now qualify the
complete native Elysia/oRPC server story, including the owning telemetry gate.
Admit this complete story through the same native stack workflow without making tasks 12.1/12.2
artificial prerequisites or claiming the remaining native hosts are complete.
The one native sweep removed the four merged
predecessors and the targeted child restack preserved an identical tree.
All held worktree heads and staged telemetry work remain unchanged.
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
