> **Preserved evidence, not current authority.** September 4 pre-release state; later release supersedes its pending-state claims.
> Imported on 2026-09-15. Narrative retained; local links normalized where available.
> Unbundled local references are provenance text, not repository dependencies.
> See the [source register](../../SOURCES.md#prior-recovery) and [current assessment](../../assessment.md).

# Habitat Recovery Assessment

September 4, 2026. Read-only assessment of Habitat, with focused Civ7 and Magic dependency checks.

## Assessment

**There is valuable, tested work to keep. The live runtime is substantially unfinished. The most important correction is to the scope and decision process, not a wholesale rollback.**

Pausing was justified given unresolved semantics and your inability to attend to consequential decisions. By its latest recorded stop, the work had reached a new category of commitment: maintaining and distributing a corrected external database server, before the general runtime could continue. The previous agent correctly stopped before creating that external obligation. It should also have reopened the question of whether that obligation belonged on the runtime's critical path at all.

I recommend preserving the released foundation and the accepted cold runtime owners, correcting a few concrete defects/constraints, and separating optional ledger delivery from the first useful runtime release. This is a recommendation for a targeted scope amendment, not a change I have applied or permission to bypass the existing gate.

## Where Habitat Actually Is

Canonical Habitat still lives at the legacy repository locator `rawr-hq-template`. Local and remote `main` both point to `374149800a067e527342e334ff6a3022fbd38cd7`, dated August 11. Today's npm query still reports SDK `0.5.15` as latest. Its paired CLI release is also `0.5.15`.

| Layer | Actual State | What That Means |
| --- | --- | --- |
| Repository, policy, SDK/CLI foundation | Released as 0.5.15 | Nx/Bun integration, policy evaluation, service/schema interfaces, service/resource blueprints, native external CLI plugin management, declarative telemetry |
| Definition and selection | Landed after that release | Cold app, process, profile, entrypoint, plugin and service declarations; immutable launch identity |
| Derivation and compilation | Landed, unreleased | Normalizes declarations and constructs a selected-process plan without starting anything |
| Provider plans and boot ordering | Landed, unreleased | Describes acquisition/release and computes dependency order; does not execute resource acquisition |
| Provisioning, binding and execution | Not built in the final owners | No complete live managed runtime, service-binding cache or process execution path |
| Mounting, native harnesses and observation | Not built in the final owners | No working final `startApp`, native server/async integration, coordinated stop or end-to-end runtime telemetry/readiness |
| Final runtime release and migrations | Not done | Consumers cannot yet install the promised complete runtime |

```mermaid
flowchart LR
    A[Definition and selection] --> B[Derivation]
    B --> C[Compilation and boot ordering]
    C --> D[Provisioning and service binding]
    D --> E[Native mounting and stop]
    E --> F[Observation and released runtime]
    classDef landed fill:#e5f3eb,stroke:#347657,color:#173e2b;
    classDef pending fill:#fff3cf,stroke:#947323,color:#493900;
    class A,B,C landed;
    class D,E,F pending;
```

Green means landed source, not necessarily released. Yellow means still required.

There are 27 Nx projects including the root. Five of the intended ten private runtime owners exist: schema, definition, derivation, compiler and bootgraph. The other five carry much of the difficult live lifecycle behavior, so this is not evidence that the runtime is halfway complete.

An important trap: current-main SDK metadata still says `0.5.15`, but its source has 21 export keys; the published 0.5.15 package has seven. The newer cold runtime faces are **not** in the published artifact. Compiler and bootgraph also still lack their eventual terminal SDK composition calls.

Evidence: [SDK boundary](../../../../../packages/core/sdk/README.md), [compiler/bootgraph handoff](../../../../../packages/core/sdk/README.md), [release receipt](../../../../../openspec/changes/archive/2026-09-06-realize-app-runtime-spine/foundation-continuation-0-5-15-release-receipt.json#L4), and fresh registry/export inspection.

## Findings That Matter

### 1. The Workstream Turned An Integration Into A Global Blocker

**High-priority scope correction.** The current stop is task `6.3f`, at `AUTHORIZATION_REQUIRED`. It asks for an independently released corrected Fluree server, including external repository/registry ownership, maintenance, security, reproducibility and other organizational obligations. No external artifact was selected or created in the recorded work.

The underlying correctness concern is substantive: the August 11 investigation found numeric transaction-position cutoffs where unrestricted merge history required commit-ancestry reasoning. It did not run its live F1/F2 probes because no candidate passed the source screen. That is negative source-qualification evidence, not a completed runtime test or a deployed failure.

But the original August 6 sequence went from boot ordering directly into generic scoped acquisition. Ledger and temporal inquiry integrations were added later. Neither canonical system document makes Fluree a fundamental runtime dependency. Task 7.1 depends on definition, compiler and bootgraph; the dependency on the Fluree providers is specifically introduced into the later conformance proof at 7.4.

The chosen decision offered too narrow a choice: remove merge, or preserve every existing constraint and own a corrected server. A third option was available: preserve the ledger's promised behavior, keep that integration unreleased, and finish the general runtime independently.

**Recommendation:** change the dependency and release scope, not the truthfulness of the merge guarantee. Use a real, qualified provider to prove generic lifecycle behavior. Do not silently weaken ledger semantics, fake its acceptance, or approve a database fork simply to make the queue move.

Evidence: [fork decision and prerequisite](../../../../../openspec/changes/archive/2026-09-06-realize-app-runtime-spine/tasks.md), [generic acquisition dependencies](../../../../../openspec/changes/archive/2026-09-06-realize-app-runtime-spine/tasks.md), [global sequencing rule](../../../../../openspec/changes/archive/2026-09-06-realize-app-runtime-spine/execution-queue.md). Historical comparison: `7457505fc` versus `a2c1178f8`.

Freshness caveat: Fluree released [v4.1.6 on August 20](https://github.com/fluree/db/releases/tag/v4.1.6). Its [merge source](https://github.com/fluree/db/blob/v4.1.6/fluree-db-api/src/merge.rs#L446) still passes `ancestor.t` into conflict/replay/copy paths. That does not establish a complete fresh failure proof, but there is no basis to assume the issue disappeared. Requalify current artifacts when deliberately reopening the ledger; do not treat August 11's inventory as permanently exhaustive.

### 2. Incidental Implementation Choices Have Become Too Rigid

**Material maintainability and autonomy problem.** Some rules correctly protect public contracts, ownership and lifecycle boundaries. Others freeze exact private filenames, test-file counts, total changed-file counts and numbers of package records. The ledger slice is constrained to exactly 27 files; a routine additional helper can become an authority exception rather than an engineering choice.

For example, the compiler blueprint allows exactly four source filenames while `compile-runtime-plan.ts` has 1,774 lines. The rule does not prove that this is the best decomposition; it makes another decomposition unlawful until the policy changes. That is the opposite of leaving ordinary implementation decisions to a capable owner. Derivation and compiler also substantially duplicate binding normalization; the performance defect below occurs in both copies. Consistency validation is useful, but duplicating its semantic implementation is not the only way to obtain it.

Current-state readability has also deteriorated. The supposedly short execution queue is 1,542 lines and contains several superseded declarations of the "sole active" task. The canonical runtime document contains task-specific history and file ceilings even though the architecture says canonical specifications must not report implementation status.

**Recommendation:** retain closed ownership boundaries, explicit public interfaces and behavioral tests. Revisit exact private file inventories and temporary diff ceilings. Keep one current status view; move historical receipts out of imperative instructions. Do not rewrite all documentation before resuming, but repair the active path so it is readable and permits ordinary engineering judgment.

Evidence: [compiler source closure](../../../../../.habitat/blueprints/runtime-compiler/structure.toml#L28), [27-file ceiling](../../../../../openspec/changes/archive/2026-09-06-realize-app-runtime-spine/tasks.md), [status separation](../../../../system/HABITAT_ARCHITECTURE.md), [temporary state in canonical mechanics](../../../../system/HABITAT_RUNTIME_REALIZATION.md).

### 3. A Small Valid Service Graph Triggers Exponential Planning Work

**Actual implementation defect to fix before runtime adoption.** Both derivation and compiler traverse a service's children before checking whether the effective binding was already computed. Repeated shared dependencies therefore create exponentially repeated traversal even though the final output is correctly deduplicated.

A bounded, accepted graph with 34 service definitions and 34 output bindings took approximately six seconds of synchronous derivation plus compilation. Depths 4, 8, 12 and 16 took approximately 5, 33, 371 and 6,082 milliseconds respectively in my fresh run. No authored callback executed. Exact timings are machine-dependent; the recursive recurrence and delayed cache lookup establish the problem.

**Recommendation:** memoize equivalent effective binding requests before repeated traversal, including inherited scope/config and path-local overrides. Preserve refusal of genuinely divergent diamond bindings; caching only by service id would introduce a different correctness bug. Add a stable operation-count or equivalent bounded regression test rather than a fragile timing threshold.

Evidence: [derivation recursion](../../../../../packages/core/runtime/derivation/src/derive-runtime-artifacts.ts#L608), [late derivation cache](../../../../../packages/core/runtime/derivation/src/derive-runtime-artifacts.ts#L648), [compiler recursion](../../../../../packages/core/runtime/compiler/src/compile-runtime-plan.ts#L690), [late compiler cache](../../../../../packages/core/runtime/compiler/src/compile-runtime-plan.ts#L736). Independently reproduced by both readers.

### 4. Distinct Nested Service Instances Are Rejected Too Early

**Concrete composition limitation to resolve before live binding.** A service with dependencies named `left` and `right`, both targeting the same service definition but selecting genuinely distinct instances, fails with `duplicate topology edge`. Topology drops the dependency's local name and instance distinction before duplicate checking. Later binding normalization cannot recover a graph already rejected.

A minimal comparison service using two store instances reproduces this. Selecting the same two instances directly at a plugin root succeeds, so the limitation is specifically in nested service composition, not a complete absence of instance support. Forcing that composition into the plugin would move an internal service concern outward.

Existing topology tests codify the duplicate-edge refusal. This therefore needs a coordinated contract/test correction, not just deletion of a guard. Reconsider whether topology should deduplicate abstract edges or preserve enough relation identity, while retaining distinct instance binding and real duplicate detection.

Evidence: [identity lost in dependency edges](../../../../../packages/core/runtime/derivation/src/normalized-runtime-topology.ts#L271), [duplicate refusal](../../../../../packages/core/runtime/derivation/src/normalized-runtime-topology.ts#L314), [dependency traversal](../../../../../packages/core/runtime/derivation/src/normalized-runtime-topology.ts#L367). Independently reproduced in this assessment.

### 5. Whole-App Validation Creates Process-Startup Coupling

**Design constraint, not a demonstrated live isolation failure.** A resource-free server process derives and compiles successfully. Add an unselected async plugin requiring a resource absent from that profile's provider selections, and server derivation now throws `A required resource has no provider` before the compiler can filter to the server closure.

A complete app-wide profile can be a legitimate design choice. The issue is whether that should also be mandatory for independently deployed process profiles. This is missing provider-selection admission, not a claim that an unavailable async database stops an already running server or that unselected credentials are acquired.

**Recommendation:** decide and test this boundary before final runtime adoption. If profiles are intentionally app-wide, state that clearly. If independently provisionable process profiles are intended, separate whole-app structural validation from selected-process provider coverage rather than accepting cross-process startup coupling by accident.

Evidence: [whole-app topology walk](../../../../../packages/core/runtime/derivation/src/normalized-runtime-topology.ts#L325), [coverage refusal](../../../../../packages/core/runtime/derivation/src/derive-runtime-artifacts.ts#L750). Independently reproduced; the compiler's selected-process filtering is not itself the fault.

### 6. A Small Canonical-Identity Bug Escaped The Tests

**Bounded correctness fix, not rollback evidence.** `canonicalJson("\uD800")` accepts a trailing unpaired high surrogate, while the same surrogate followed by ASCII is rejected. `charCodeAt(index + 1)` returns `NaN` at the end, so both range comparisons are false. This violates the implementation's intended canonical-string rejection rule and can admit malformed identity material.

Fix the end-of-string condition and add focused tests for values and object keys before releasing this identity surface. I found no evidence of existing corrupted consumer identities; the new runtime identity surface remains unreleased.

Evidence: [canonicalString](../../../../../packages/core/runtime/derivation/src/identity-policy.ts#L19). Independently reproduced on current main.

### The Next Unproven Boundary

The cold plan is not yet a proven executable-service handoff. Current [ServiceDefinition](../../../../../packages/core/runtime/definition/src/service.ts#L41) carries declarations and native contract helpers, but not a service constructor/router. Real service constructors live separately. The compiler's source-unavailable handoff fixture has [empty service/resource selections](../../../../../packages/core/runtime/compiler/test/derivation-handoff.test.ts#L42). It does not prove how a selected, real service becomes callable without recovering implementation from source.

That is an upcoming integration obligation, not a failed completed promise. It matters because it is precisely where additional declaration-only proof would be insufficient. The next vertical proof must use an actual service implementation, acquired resource and native host.

## Did Implementation Follow The Specifications?

**Yes, but the governing specifications evolved. It was not literal implementation of the original unfinished documents, and it was not a wholly unrelated replacement architecture.**

The May architecture/runtime lineage is still recoverable in Git. On August 6 it was promoted and reconciled into the repository-local `HABITAT_ARCHITECTURE.md` and `HABITAT_RUNTIME_REALIZATION.md`. These retain the central model: services own meaning, resources expose capabilities, providers implement them, plugins project, apps select, and the runtime realizes those declarations through explicit phases.

The current authority order is explicit: current owner intent; local canonical architecture/runtime/ontology with section-level amendments; active OpenSpec sequencing and named amendments; pinned vendor mechanics; implementation evidence; older external documents and consumer prototypes as directional evidence. See the [authority router](../../../../../.agents/skills/habitat-platform-authority/SKILL.md) and [lineage record](../../../../../openspec/changes/archive/2026-09-06-realize-app-runtime-spine/authority-amendment.md).

This evolution was partly exactly what you requested. Recovered user messages explicitly authorized grounded redesign under the core model, vendor-native implementation, the official Effect-oRPC boundary, simpler layered blueprint authoring, and substrate-owned telemetry. Reverting those improvements to match an older example would be a mistake.

Other choices are engineering decisions that should remain challengeable: compiler diagnostics became built-in exceptions, precise instance/profile behavior hardened, and incidental layout limits accumulated. A generated specification is not independent validation of the decision that generated it.

The clearest boundary crossing is the external fork. In the recovered task `RAWR Lifecycle Normalization Implementation`, the investigation through option (b) and PRs #1005/#1006 occurred without an intervening user message. The agent selected that strategic direction under broad delegation, then requested organizational authorization. That is different from you explicitly deciding a database distribution was the next priority. The later stop preserved the external boundary, but the plan still needed a product-level challenge.

## How Much Remains?

The active workstream contains **57 checked and 58 unchecked tasks, 115 total**. These are not equal units and should not be presented as 50% product completion. Several completed tasks are documentation amendments or proof expansions; an entire live owner or external server qualification also counts as one.

| Workstream Stage | Checked / Total |
| --- | ---: |
| Authority and migration input | 7 / 7 |
| Generic law and repository separation | 10 / 17 |
| Core normalization and sole SDK | 5 / 5 |
| Definition and derivation | 17 / 17 |
| Compilation | 6 / 6 |
| Provider plans, boot order, ledger/inquiry | 12 / 16 |
| Scoped acquisition | 0 / 5 |
| Process access and service binding | 0 / 5 |
| Registry and execution | 0 / 2 |
| Adapters, harnesses, observation, mounting | 0 / 7 |
| Habitat Oclif runtime vertical | 0 / 8 |
| Additional CLI verticals | 0 / 3 |
| Server and async native harnesses | 0 / 6 |
| Web harness | 0 / 2 |
| Audit, release, handoff and cleanup | 0 / 9 |

Repository separation is completed despite remaining cross-cutting stage-2 activation obligations. The important physical fact is that the phases where resources are acquired, services become callable, hosts start, failures unwind and processes stop remain ahead. This is not merely polishing an almost-working runtime.

The workstream is also larger than the minimum reusable runtime: it includes extra CLI verticals, web proof, ledger/inquiry integrations, Rawr product transfers, consumer migrations, archival and cleanup. Even completing it would not complete every Habitat ambition: persisted observability storage/indexing/retention and the deployment control plane are explicitly [separate future containers](../../../../../openspec/changes/archive/2026-09-06-realize-app-runtime-spine/execution-queue.md).

## Civ7 And Magic Are Not Blocked In The Same Way

**Civ7:** the latest initiative is on `agent-root-civ7-capability-migration-frame` at `10e6b74493`, not the primary checkout's older main. Its frame still says 0.5.5 lacks admitted `service@1`. Published 0.5.15 now contains service@1 and service@2, and Habitat's queue explicitly permits Civ7 foundation migration. That release-availability gate is stale. Consumer installation, policy migration, and Civ7 V8-isolate compatibility still need proof; availability is not acceptance. The next product unit remains Controller Foundation, not the whole modding platform. See Civ7's gate (external source: `$HOME/Documents/.nosync/DEV/worktrees/wt-agent-root-civ7-habitat-051-ground/docs/projects/civ7-capability-realization/WORKSTREAM.md:241`) and [Habitat's updated handoff](../../../../../openspec/changes/archive/2026-09-06-realize-app-runtime-spine/execution-queue.md).

**Magic:** main is `3db8641a1`; the clean staging branch ends at `f9a6aaf77` with two small IaC corrections. Magic already has a direct native realization of separate API, async and MCP process shapes. It explicitly has not adopted the unpublished Habitat runtime. Its immediate staging and Listing Intake acceptance work is separate from Habitat migration. The last task records a retreat from speculative credential automation to a stable, source-less staging bootstrap; it does not claim hosted product acceptance. I did not query live hosted infrastructure or credentials today. See runtime status (external source: `$HOME/Documents/.nosync/DEV/magic-apply/magic-migration/docs/system/async-runtime-realization.md:102`) and active sequence (external source: `$HOME/Documents/.nosync/DEV/magic-apply/magic-migration/.agents/skills/magic-openspec-workstream/references/current-target.md:23`).

My recommendation is to keep both broad migrations paused during the short Habitat realignment, not to require every imagined Habitat subsystem to finish before either product moves. Keep Civ7 and Magic as concrete acceptance pressures. Once the frame is corrected, Civ7's already-released foundation adoption is an independently useful unit; Magic remains the stronger process-lifecycle oracle for the runtime delivery.

## What To Keep, Change And Defer

- **Keep:** repository separation; one public SDK and CLI; service/resource/provider ownership; the cold definition/derivation/compiler/bootgraph work; native vendor execution ownership; real lifecycle and behavior tests; published-artifact consumer boundaries.
- **Correct:** exponential shared-dependency traversal, the nested-instance constraint and the Unicode case; clarify process-profile coverage; relax incidental private-layout ceilings; replace contradictory current-state routing with one active view. Make focused changes with matching tests, not a wholesale rewrite.
- **Reconsider:** the external Fluree fork as a prerequisite for general runtime delivery; the size of the final release container; and the rule that a blocked integration stops unrelated implementation.
- **Defer without pretending complete:** ledger/inquiry behavior that has not earned its release, broader Rawr transfers, and product extremities that are not needed for the first complete runtime consumer story.

There is no deployed Fluree fork to undo. The rejected semantic-ledger attempt is preserved in stash `331f7e68b`, containing 27 files, rather than landed on main. The similarly named branch contains documentation, not completed provider source. Do not restore that stash automatically. Historical mixed branches and a staged telemetry receipt worktree are preserved evidence with existing owners, not a pile to merge or delete indiscriminately.

## How To Regain Control

1. **Reconfirm the small semantic core once.** Keep the existing architecture where it is sound. Distinguish product guarantees, replaceable vendor mechanics, ordinary implementation discretion and genuinely new organizational commitments. You should not need to approve helper files or continuously police private decomposition.
2. **Amend the dependency graph, not every specification.** Park unreleased ledger/fork work on its own track. Keep its correctness requirements intact. Remove only its accidental gating of generic provisioning and the consumer-critical runtime release. This is the focused decision I recommend making together before implementation resumes.
3. **Build toward an early complete runtime proof.** The next implementation work is generic real-provider acquisition, preflight and rollback using the landed compiler/bootgraph. Carry it through service binding and native mounting into a complete start/use/observe/stop story. Then prove independently started server and async processes, sibling restart isolation, cancellation, native stop-before-release and released-package consumption. Do not mistake more cold DTOs or an in-repo demo for completion.
4. **Reconnect a consumer before broadening again.** Use Magic-shaped server/async behavior as the runtime acceptance target and Civ7 as the portability/foundation check. Release only complete, honest capabilities; consumers replace their prototypes only after replacement acceptance. Review at meaningful semantic and operating boundaries, not after every mechanical choice.

This is not a proposal to stop and re-plan continually. It is one focused correction to restore a frame in which implementation decisions can become routine again. A stronger agent should reduce the need for micromanagement, not produce more rules requiring it.

## Would I Take Over?

Yes, I would be comfortable owning implementation after that targeted realignment. I would not resume the inherited autonomous goal unchanged, and I cannot honestly establish that I am categorically better than the previous agent from this audit.

The evidence shows substantial competent work and real self-correction by the prior agent. It also shows a control failure: local conformance and increasingly detailed constraints displaced the question of whether the current task still served the intended product. Changing models alone does not fix that. My commitment would be to own ordinary implementation decisions, challenge self-generated constraints, and surface a new database-maintenance obligation as a scope decision rather than disguise it as the next implementation detail.

## Verification And Limits

Fresh checks against current Habitat main:

| Check | Result |
| --- | --- |
| Remote main identity | Matches local `374149800a067e527342e334ff6a3022fbd38cd7` |
| Main's GitHub Repository Ratchet | Success, run `31552506151` |
| Full no-cache `check` graph | Passed: 26 projects plus 66 dependency tasks |
| Full no-cache configured `test` graph | Passed: 23 projects plus 15 dependency tasks |
| Five runtime-owner test suites | 100 tests passed within that graph |
| Targeted behavior probes | Reproduced exponential shared-dependency traversal, both composition constraints and the Unicode bug; no authored plugin body executed |
| Registry and installed foundation pack | Latest SDK 0.5.15; published export closure lacks runtime faces; pack includes service@1/@2 |
| Repository source changes by this assessment | None; existing untracked/staged/user changes preserved |

Commands included `NX_DAEMON=false bunx nx run-many -t check --skip-nx-cache --parallel=2 --outputStyle=static` and the corresponding `test` graph with `--parallel=1`. The check graph covered lint, types, policy and dependency build work. A passing regression suite does not validate the product choice behind a test: two of the reported constraints are consistent with current tests and law.

I did not rerun every specialized installed-package/Windows acceptance, live Civ7 gameplay, Magic hosted acceptance, or Fluree image qualification. The final Habitat runtime cannot be tested end to end because it does not exist yet. This was a broad recovery assessment with focused adversarial code checks, not exhaustive certification of every file or historical branch.

Skills used: framing-design, habitat-platform-authority, dual-role-workstream, and review-code-quality. Three bounded independent readers covered workstream state, authority lineage and implementation risk; their conclusions were integrated with fresh root-level verification.
