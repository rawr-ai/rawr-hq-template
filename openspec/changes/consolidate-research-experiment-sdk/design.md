## Frame

### Product Outcome

The product is a small HQ platform capability for launching, recovering,
inspecting, evaluating, and preserving research experiment cells. It is not an
SDK package and not a research-specific application.

One `research-experiment` service owns the cell domain. One CLI plugin projects
the service into the existing HQ app. The HQ app selects the projection and a
runtime profile. Runtime realization validates and provisions the selected
providers, binds the service, and supplies the exact invocation context.
Research studies remain exterior consumers.

### Deployment Law

The primary deployment is one trusted local operator using one HQ app/runtime.
Distinct cells may execute concurrently. The system must tolerate ordinary
process interruption, crash, and restart. Optional Railway deployment changes
process placement only; it does not authorize multiple writers, create a new
semantic app, or introduce an adversarial local-host threat model.

Solver and evaluator separation protects benchmark validity. The host
repository, ordinary Git/Bun installation, configuration, package store, and
installed dependencies are trusted operating inputs. Re-entry prevents
accidental duplicate same-cell work and resumes completed boundaries. It is not
distributed consensus, supply-chain attestation, or a multi-writer protocol.

### Hard Core

1. One frozen identity and input govern a cell instance.
2. The submitted artifact, not solver prose or telemetry, is the product
   output.
3. Durable cell truth advances monotonically:
   `Missing -> Running -> SolverTerminal -> Evaluated`.
4. Provider lookup identities are durable before provider acquisition.
5. Recoverable solver work is never rerun.
6. The solver terminal is durable before verification; evaluation is durable
   before telemetry projection.
7. The service owns domain state, migrations, repositories, write ordering,
   reconciliation policy, and terminal/evaluation immutability.
8. Resources and providers own live capability mechanics, not experiment
   truth.
9. Study owners retain study meaning, scheduling, evidence, and
   interpretation.
10. Telemetry is correlated observation, never cell truth.

### Exterior

The capability does not own cases, prompts, treatments, model/agent allocation,
run schedules, rubrics, hidden checks, aggregate interpretation, evidence,
history, release disposition, provider accounts, gateway lifecycle, or model
catalogs.

## System Map

### Ontology Ledger

| Kind | Identity and owner | Owns | Must not own |
| --- | --- | --- | --- |
| app | existing HQ app | product membership, selected projections, runtime profiles, provider selections, entrypoints, process-role shape | service truth, provider implementation, acquisition |
| runtime profile | HQ app-owned selection | provider/config selection facts for a process | acquisition, domain policy |
| runtime realization | canonical runtime compiler, bootgraph, Effect kernel, and process runtime | coverage/dependency validation, acquisition order, one process runtime, service binding, invocation context, release | app membership, study semantics, service writes |
| plugin | one CLI projection | CLI contract, command policy, service-use declaration, native command projection | experiment state, providers, persistence, app membership |
| service | `research-experiment` | cell contracts, schemas, repository, migrations, transitions, recovery and evaluation sequencing, durable evaluation semantics, refusals, authoritative writes | provider selection/acquisition, CLI shape, rubric/check meaning, study interpretation |
| module | service-owned `cells` subdomain | `run` and `inspect` operations plus narrowed DTO/policy/repository meaning | root config/dependency bags, sibling internals |
| resource | provisionable capability contract | stable resource identity, value shape, lifetime/config/diagnostic contract | provider implementation, service domain state |
| provider | resource-local implementation | acquisition/release, native client and resource-specific mechanics, health, redacted diagnostics | selection, cell transitions, study policy, a generic provider protocol |
| package | cold library only after a second independent consumer proves it | runtime-agnostic declarations or helpers | live context, state, providers, service execution |
| study owner | oRPC or Inngest research vault/program | cases, inputs, treatments, model allocation, schedules, rubrics, hidden checks, results, evidence, interpretation | provider wiring, persistence implementation, runtime composition |

No current `packages/research-sdk` production file qualifies whole-file as a
cold, independently consumed package boundary.

### Context Funnel

Cold realization:

```text
research-experiment declares resource requirements
  -> CLI command plugin declares use of research-experiment
  -> HQ app
     selects plugin + runtime profile + process role
  -> runtime compiler
     plans service closure + validates provider coverage/dependencies
  -> bootgraph + Effect kernel
     provision selected resource providers
  -> process runtime
     binds/projects research-experiment + hands off its client
  -> CLI adapter/harness
     mounts the command handler
```

Invocation:

```text
operator + study-owned request data
  -> mounted CLI handler
  -> invocation-bound research-experiment client
  -> cells module
  -> native oRPC run or inspect handler
```

Every descent narrows the authoring/type view. Native oRPC context may remain
additive at runtime; exact service and module views prevent downstream code
from accessing wider keys without a custom context-stripping wrapper. The CLI
plugin does not receive raw providers. The service does not receive the
app/profile selection bag. The cells module does not reopen root dependencies.
Handlers receive TypeBox-admitted input and the exact module context only.

Native oRPC owns contracts, routers, middleware, context, declared errors,
transport, and clients. TypeBox owns schemas, structural validation, and
derived TypeScript types. Effect owns typed execution, interruption, and
resource safety. Effect-oRPC adapts an Effect computation at a native oRPC
procedure boundary; it is not a second router, context, schema, or runtime
authority. The canonical Template TypeBox bridge is the only Standard Schema
bridge.

### Public Operations

The service exposes one `cells` module with two callable operations:

- `cells.run`: start or resume one exact cell, advance every reachable
  incomplete boundary until `Evaluated` or the first typed refusal/recoverable
  infrastructure failure, and return durable truth, study outcomes, and
  correlation identifiers.
- `cells.inspect`: read the durable state and correlations for one exact cell.
  It performs no transition and never acquires, cancels, cleans, or replaces a
  provider subject.

The CLI plugin projects both operations. Whether another plugin later projects
the same service to an internal API or async host is a separate product
decision. Service callability does not itself make the operation public on a
network.

Fresh provider/process status is runtime diagnostic data. The CLI may display a
redacted runtime diagnostic read model beside `cells.inspect`, but the
diagnostic does not alter or outrank the service result.

### Observable Flows

`cells.run`:

```text
validate exact cell request
  -> read service-owned cell repository
     Evaluated      -> adopt; reconcile recorded cleanup; optionally project/read back
     SolverTerminal -> adopt; reconcile recorded cleanup; evaluate and persist Evaluated
     Running        -> inspect persisted provider lookup identities
     Missing        -> persist Running + deterministic lookup identities
  -> recoverable-subject providers create or adopt their native subjects
  -> execute or recover agent outcome
  -> capture a submitted artifact when one exists
  -> persist Submitted or NoSubmission SolverTerminal
  -> reconstruct a fresh solver-inaccessible evaluator subject
  -> apply only the submitted artifact and hidden study verifier/rubric inputs
  -> evaluate through service sequencing and provisioned resources
  -> persist Evaluated
  -> project non-authoritative telemetry
  -> return durable truth and correlations
```

`cells.inspect`:

```text
validate exact cell identity
  -> read service-owned repository
  -> return Missing | Running | SolverTerminal | Evaluated
     plus durable provider-neutral locators/correlations
  -> optional CLI display joins a separate redacted runtime diagnostic snapshot
```

The service handler remains the operation authoring site. Internal policies,
repositories, and ports retain only independently meaningful decisions or
outside capability calls. There is no detached generic stage runner that
reconstructs the handler environment.

## Topology Decision

### Alternatives

| Family | Best version | Decision |
| --- | --- | --- |
| A. reduced SDK monolith | a cold package defines cell contracts and a host supplies ports | reject: the existing package also owns execution, state, and runtime semantics; reducing its surface does not give a package service authority or a second independent consumer |
| B. dedicated research platform/app | an independently deployable research product selects its own projections, profiles, and process roles | reject now: two study consumers do not establish an independent product identity, lifecycle, security boundary, or deployment need |
| C. service with study-owned binding | a service owns cell semantics while each study binds persistence and providers | reject: studies would shadow app/profile/runtime authority and duplicate the operational composition this change exists to remove |
| D. service-centered HQ composition | one service, one CLI projection, existing HQ app/profile/runtime, generic resources/providers | choose: it assigns every behavior to an existing architectural kind and leaves study meaning exterior |

### Decision And Growth Falsifiers

Choose D.

- Promote to a dedicated app only if research operations require an independent
  product identity, deployment/security boundary, lifecycle, or role set that
  cannot be expressed by the HQ app.
- Add a durable async projection only if a run must outlive the request/process
  and an explicit product operation needs durable scheduling, retry, wait, or
  cancellation. Studying Inngest does not satisfy this condition.
- Add an operation journal only if the monotonic service record cannot recover
  a demonstrated local write/crash ambiguity without losing accepted intent or
  rerunning completed work.
- Add a composite provider only if one vendor-native lifecycle or auth
  transaction must acquire/release two resource identities atomically and
  cannot be represented through provider dependencies plus service sequencing.
- Extract a package only when a second independent consumer needs the same cold
  contract/helper without importing the service or runtime values.
- Expand `cells.inspect` only if durable truth plus runtime diagnostics cannot
  answer a named operator decision. Inspection must remain read-only.
- Add a third public operation only when a named operator action has independent
  domain intent, authorization, and outcome that cannot be expressed truthfully
  as run/resume or read-only inspect. Splitting an internal stage does not
  qualify.

## Cell Domain

### Direct Identities

The service owns direct, TypeBox-defined data:

- opaque study, cell, and study-assigned instance identifiers;
- frozen input identity and exact implementation identity;
- `Running` attempt identifier and deterministic provider lookup identities;
- provider-neutral observation, sandbox, process, session, and artifact
  correlation references as they become known;
- submitted artifact identity when the terminal has a submission;
- solver terminal and study outcome;
- evaluation result referring directly to the terminal.

The service does not restore generic stage tags, predecessor closures,
self-digest envelopes, replay lineage, provider envelopes, or a portable data
framework.

### State Machine

```text
Missing
  -> Running(
       attempt,
       frozen input,
       deterministic provider lookups + non-secret recovery namespaces
     )
  -> SolverTerminal(
       outcome =
         Submitted(submitted artifact, agent/study outcome)
         | NoSubmission(noncompletion or no-valid-submission outcome),
       retained solver lookups/locators,
       deterministic evaluator lookup + non-secret recovery namespace
     )
  -> Evaluated(evaluation)
```

Only the service defines the record schema, migrations, repository semantics,
legal transitions, conflict checks, and reconciliation decisions. A generic
persistence resource supplies physical read/write/transaction capability. Its
provider does not know cell states.

`cells.inspect` is a read of this machine. It has no transition edge.

### Idempotence And Crash Windows

| Boundary | Required behavior |
| --- | --- |
| before `Running` persists | no provider effect is legal |
| persistence result unknown | stop the call; the next call reads durable state before any effect |
| after `Running`, before acquisition | require the current non-secret provider recovery namespace to equal the persisted namespace, then create-or-adopt under the persisted deterministic lookup identity |
| after acquisition, before concrete locator update | recover through the deterministic lookup identity and then record provider-neutral locator details |
| provider subject is live | return the declared `CellRunInProgress` domain refusal; the caller may inspect or retry the same cell later, and no automatic wait, attach, poll, or replacement occurs |
| solver exited before artifact capture | inspect and recover the retained workspace/outcome, capture the artifact, and never rerun the solver |
| provider subject is absent | reconcile the recorded attempt; resume only when the service can prove no live/recoverable subject will be replaced |
| preterminal cancellation or cleanup is unconfirmed | keep `Running` and the lookup/correlation references; do not claim release or start replacement work |
| product cancellation/noncompletion is confirmed before a solver terminal | recover any valid submission; otherwise persist the study-declared `NoSubmission` outcome plus exact solver correlations; only then destructively release the solver subject |
| process termination is confirmed but terminal classification is incomplete | retain the stopped subject/workspace as `Running`; termination alone authorizes neither destructive release nor replacement |
| Effect interruption stops the process before terminal classification | retain the stopped subject/workspace as `Running`; re-entry classifies it, and interruption alone invents no study outcome |
| solver terminal write is unknown | retain the solver subject and stop; never release the last recoverable outcome until the write is known durable |
| cleanup is unconfirmed after terminal/evaluation persistence | preserve the terminal/evaluation and exact provider correlation; a later `cells.run` may inspect and retry cleanup without changing durable truth |
| after terminal persistence | adopt the terminal; reconcile recorded postterminal cleanup before or alongside only missing evaluation/projection work |
| evaluator completes before `Evaluated` persists | adopt its retained outcome through the terminal-bound evaluator lookup; never rerun completed evaluator work |
| evaluator is interrupted without a completed recoverable outcome | only after confirmed termination and proof that no completed outcome existed, rerun the same evaluator attempt from the exact terminal and frozen evaluator inputs |
| evaluator disposition is unknown or absence could hide a completed outcome | return a recoverable infrastructure failure; retain correlations and do not reevaluate |
| after evaluation persistence | adopt the evaluation; reconcile recorded postterminal cleanup; retry only explicitly requested non-authoritative projection/readback without reevaluation |
| telemetry projection/readback fails | preserve terminal/evaluation truth and report projection diagnostics separately |

Distinct cell identities may overlap. Same-cell calls converge through the
service repository; there is no process-wide serialization, lease service,
fence protocol, residue graph, or distributed CAS.

### Failure Taxonomy

| Class | Examples | Authority and effect |
| --- | --- | --- |
| domain refusal | identity mismatch, `RecoveryNamespaceMismatch`, illegal transition, terminal conflict, `CellRunInProgress` | declared oRPC error/result; no new provider effect |
| recoverable infrastructure failure | provider unavailable, persistence outcome unknown, artifact capture failure, observation settlement failure, cleanup uncertainty | typed service/resource failure; durable truth remains; re-entry starts by reading it |
| study outcome | agent noncompletion, compile/test failure, policy violation, empty/invalid submission, low score | persisted terminal/evaluation data; never infrastructure retry policy |
| diagnostic failure | telemetry export/readback or wide-event drain failure | non-authoritative status; cannot change cell truth |
| unexpected defect | undeclared implementation fault | private cause and redacted diagnostics; native internal oRPC failure |

Expected caller-actionable failures are declared through native oRPC with
TypeBox data. Private causes, stacks, prompts, credentials, and raw provider
output do not cross the boundary. Fiber interruption is not product
cancellation.

## Resource And Provider Boundary

### Resource Families

| Resource | Service-facing capability | Provider responsibility |
| --- | --- | --- |
| persistence substrate | physical atomic read/write/transaction primitives for the service repository | acquire/release filesystem or database capability, health, redacted diagnostics |
| filesystem | bounded workspace, staging, file, and cleanup operations | host filesystem implementation and lifecycle |
| process/Bun | structured process execution, input/output capture, cancellation, termination status | Bun/host process implementation |
| native Git | materialize exact revision/subtree; capture/apply submitted patch | native Git invocation and parent-owned workspaces |
| sandbox | create-or-adopt, transfer/execute, inspect, retain/release by deterministic identity | OpenShell implementation |
| agent | invoke/cancel and decode neutral session/rollout/outcome evidence | Codex implementation |
| observation/telemetry | acquire/correlate/settle/project/read back an experiment subject and emit redacted semantic diagnostics | Langfuse/OTel implementation; EVLog remains runtime/diagnostic mechanism rather than a second research resource |

The service declares resource requirements. The CLI plugin declares service use
and any projection-local requirement. The HQ runtime profile selects providers
and config sources. The runtime compiler validates exact coverage and provider
dependency closure. Bootgraph and the Effect kernel acquire and release them.
The process runtime binds the service. No study owner, plugin, handler, service,
resource, or provider selects or provisions itself.

Providers that acquire recoverable external subjects expose only the native
create-or-adopt/inspect/reconcile operations their resource requires and return
neutral serializable locators/correlations where the service needs recovery.
Each such provider also exposes a stable, non-secret recovery namespace
identity before subject acquisition. The service binds that namespace into its
deterministic subject lookup and refuses re-entry through a different namespace
unless both selections prove the same cross-selection recovery namespace. This
is service-owned recovery data, not a provider envelope or app-profile bag. No
generic provider lifecycle facade is added. Concrete clients, secrets, Effect
runtime handles, and vendor-specific context remain provider/runtime-local.

Codex, OpenShell, and observation remain separate resource authorities. The
service sequences them. A provider dependency may express a real lower-level
need, but no composite research provider is introduced without the falsifier
above.

### Native Git Scope

The retained Git behavior is narrow:

- materialize an exact revision/tree/subtree in a clean parent-owned workspace;
- bind the base revision/tree and study-supplied product path mapping in frozen
  input;
- capture a full-index binary patch from allowed product paths;
- identify the submitted artifact by patch SHA-256;
- apply it to a fresh pristine workspace and compare the reconstructed product
  tree.

Use native Git semantics. Do not restore hostile config/attribute
neutralization, provider envelopes, exact supported-version identity,
regenerated-patch byte authority, or adversarial local fixtures.

The process/Bun resource exists only for structured cell and verifier commands.
Package build/pack/install compatibility machinery from the SDK quarry has no
proved consumer in the HQ-composed topology and is deleted. Ordinary workspace
build and dependency installation remain repository gates, not product
capabilities.

## Study Ownership

The oRPC and Inngest research programs are study owners, not canonical
runtime/plugin "lanes." Each supplies typed service input and references to:

- cases, prompts, treatments, frozen inputs, and study-assigned instances;
- model/agent allocation and study execution policy;
- product path mapping and verifier/rubric data;
- schedules, aggregation, evidence, interpretation, and reporting.

Study owners never supply executable provider callbacks, persistence
implementations, runtime profiles, raw resource contexts, or service
transition code. The service never scans a vault, infers a study directory
topology, relocates evidence, or interprets study-level aggregate meaning.
The service owns evaluation sequencing, durable record semantics, and domain
refusals; the study owns the meaning and inputs of rubrics, hidden checks, and
aggregate interpretation.

## Current, Target, And Transition Authority

### Authority Table

| Authority | Exact evidence | Status for this change |
| --- | --- | --- |
| preserved research lineage | `223835fccedcb80523b761c571130852bdb106a2`, tree `c6c7f6174b92553a9ca5b9070569eb3422eef5f9`, draft PR #531 | history/source quarry; never restack or merge as target topology |
| current canonical Template main | `2e9a2621072fd6313bf4cf9c6fca6b4824ffc2b4` | current repository authority at design time |
| canonical subject skills | Personal main `1e7f346b9b0fb7b356675d3e837295256bda7d0d` | oRPC/effect-oRPC/Inngest/effect-inngest subject authority |
| admitted service dependency closure | `b2033f38e4cbca9e3d310921e7463ff92753d8aa` | merged evidence for current oRPC/TypeBox/Effect/effect-oRPC tuple; recheck at source start |
| canonical TypeBox bridge correction | `0854024afe9a76ef0ae4ae3f427182be25fe8420` | merged and satisfied; use, do not copy |
| merged service-law refresh | `6e344c272b63e74eb4761dd0779cc4f1cdc410b8` | canonical packet content, but not fully activated by repository source-law checks |
| active service-law sequence | `5296d9c77247a6a6f418bb3b7081d47a159db21d`, `fbaaf62e1e2685803ef7d334e75dde9127a84c7d`, `2bb4be6eb3d99ee2824b75b725c92055d53a14a1` | useful committed design evidence; unmerged and explicitly unactivated |
| runtime architecture | `c9b6eb9044d709639a355dbfec83cc5a34b8a00e` | merged normative target |
| runtime simulations | `3ceb0d333b44af8cd4f8355b2a63f3150a9da0c3`, `e7d43a85fc350e275d9544172b1d31bbcea1aa38`, `b8fb660156700ab70d73760c2d701b9f2d7f073d`, `0ac6650ac1265a4c8c558c0aca24e112d67f490b` | merged contained proof only; not production authority |
| complete activated service packet | none | hard source blocker |
| production app-profile/runtime realization | none | hard source blocker |

The obsolete service pins `faa320f1...` and `3beb4936...`, the
`implementEffect(contract, Layer.empty)` root, inherited module implementers,
and a no-`.$context` rule are not target authority. The active capability-funnel
evidence instead narrows `host -> base -> service -> module -> router ->
handler`, but source must wait for that complete packet to be canonical and
activated.

### Deletion Ledger

At `223835fc`, `packages/research-sdk` contains 43 tracked files: 31 production
source files and 7 tests, with 7,873 production TypeScript lines and 4,609 test
TypeScript lines. The entire package identity is scheduled for deletion after
green transition.

| Current material | Disposition |
| --- | --- |
| direct cell/input/artifact/terminal/evaluation DTO meaning | re-author as service-owned TypeBox DTOs |
| adoption, observation, re-entry, stage-shape, and terminal-sink behavior | reduce to direct service state/repository/policy behavior; delete generic frameworks |
| `contracts/schema.ts` and portability/decode/clone/freeze machinery | delete; canonical TypeBox bridge and native validation own the boundary |
| generic `StageOutput`, predecessor/digest/publication frameworks | delete |
| capability facade, callback ports, adapter registry | delete; native service operations and resource contracts replace them |
| attempt fence, residue/orphan DAG, provider envelopes, replay lineage | delete; direct monotonic local record replaces them |
| package `Context.Service`, Layers, and `ManagedRuntime` | delete; runtime realization owns live context |
| command behavior | re-author behind process/Bun resource/provider |
| native Git materialize/capture/apply behavior | re-author behind native Git resource/provider |
| hostile Git policy and exact substrate envelopes | delete |
| package build/pack/install compatibility machinery | delete; ordinary workspace build/install remain repository gates |
| installed package graph, lock parser, runtime manifest, content/mode attestation | delete |
| package barrels, exports, project shell, package Habitat rules, `SdkIdentity` | delete |
| current package tests | replace with behavior tests at the service/resource/consumer owner; do not port wholesale |

Commit `ce282cb062f0d4bdeb80117a021aa0c766537991` remains historical
Git/Bun behavior evidence and source quarry only.

### External Consumer And Runner Disposition

The consumer census found no live `@rawr/research-sdk`,
`research-experiment`, `cells.run`, or `cells.inspect` consumer in either study
owner. It did find one active self-contained oRPC runner and historical Inngest
runner residue. The exact owner roots are
`/Users/mateicanavra/Documents/.nosync/DEV/research/orpc-effect-skillset-vaults`
and
`/Users/mateicanavra/Documents/.nosync/DEV/research/inngest-event-driven-skillset-vaults/20260715T055207Z-inngest-event-driven-skillset`;
table paths are relative to their named root:

| Owner and exact path | Disposition |
| --- | --- |
| oRPC canonical vault `20260715T031815Z-orpc-effect-skillset@c3962e8`: `20260715T031815Z-orpc-effect-skillset/research/deliverables/evaluations/real-work-skill-efficacy-20260716/evaluation/**`, except the closed retained-study allowlist `evaluation/{assay/**,contract.ts,contract.test.ts,solver-context/**}` | transition the retained model-free cell to the service, re-author proved generic behavior under Template service/resources/providers, then delete the rest of the evaluator package. The deletion includes `admission.ts` and its test, `platform/**`, `run*`, `execute*`, `langfuse*`, `review*`, top-level `openshell*`, `scripts/**`, `openshell/**`, `.repos/**`, `package.json`, `bun.lock`, `tsconfig.json`, and `effect-source.lock.json`; none of its executable shell or operational tests survive as authority |
| same oRPC canonical vault: `20260715T031815Z-orpc-effect-skillset/research/deliverables/evaluations/real-work-skill-efficacy-20260716/{*.md,admission/**,artifacts/**,corpus.json,historical-provenance.json,results/**,rubrics/**,skill-catalog.json}` plus the closed `evaluation/{assay/**,contract.ts,contract.test.ts,solver-context/**}` allowlist above | retain study-owned prompts, pure admission policy and receipts/baselines, contracts, rubrics, inputs, results, reports, and evidence; re-author any retained policy that currently imports provider/runtime code |
| oRPC divergent worktree `worktrees/behavioral-oracle@16699a7`: `worktrees/behavioral-oracle/research/deliverables/evaluations/real-work-skill-efficacy-20260716/evaluation/{platform/**,openshell*,openshell/**,run*,execute*,langfuse*,review*,admission*,scripts/**,package.json,bun.lock,tsconfig*.json,effect-source.lock.json}` | transition or quarry any independently proved divergent behavior, then delete these shadow runtime, provider, CLI, package-shell, and operational-test copies; canonical duplication is not a preservation reason |
| same oRPC worktree: `worktrees/behavioral-oracle/research/deliverables/evaluations/real-work-skill-efficacy-20260716/evaluation/codex-langfuse-plugin/**` | quarry proved projection behavior and deterministic tests into the proper Template provider boundary, preserve its provenance record, then delete this worktree-owned operational plugin copy |
| same oRPC worktree: `worktrees/behavioral-oracle/research/deliverables/evaluations/real-work-skill-efficacy-20260716/{*.md,admission/**,corpus.json,fixture-preparation/**,historical-provenance.json,results/**,rubrics/**,skill-catalog.json,evaluation/{assay/**,contract.ts,contract.test.ts,solver-context/**}}` | the study owner must bind every unique prompt, corpus item, rubric, result, report, fixture-preparation input, contract, and evidence to a named immutable study-owned Git ref or retention ledger before worktree removal. This service change neither copies nor relocates that material; if the binding is absent, removal remains blocked |
| oRPC canonical vault `20260715T031815Z-orpc-effect-skillset/research/deliverables/evaluations/bounded-cross-model-competence-20260715/**` and the eight pre-canonical sibling vaults named in `20260715T031815Z-orpc-effect-skillset/EXTERNAL-EVIDENCE-LEDGER.md` | retain immutable as historical evidence/source quarry; never execute, transition, or promote as service authority |
| Inngest canonical vault `codex/inngest-release-authority-convergence@cd78f4c`: `research/operations/run-s12-current-epoch.ts` | delete as broken historical launcher; it imports already-deleted runner/platform modules and is not a service consumer |
| same Inngest owner: `candidate/quality/evaluations/competence/{admission.json,catalog.json,packet.schema.json,packets/**,rubric.md,results-current.json}` and `research/evaluation-runs/**` | retain cases, manifests, rubrics, results, and evidence under the study owner; create a new typed service binding rather than migrate nonexistent active runtime wiring |
| Inngest historical refs `main@5fa0f43` and `codex/inngest-oracle-exit-repair@251176e`: `candidate/quality/evaluations/competence/{worker.ts,study.ts,execution.ts,experiment/**,platform/**,lane/**,openshell/**,blind-review*,langfuse-*,packet-runtime.ts}` | historical source quarry only; never restore its runner, persistence, provider, review, or projection wiring |

Inngest external caches
`/Users/mateicanavra/Library/Caches/inngest-competence-evaluation` and
`/Users/mateicanavra/Library/Caches/inngest-competence` remain governed by
`research/handoff/inngest-evidence-retention-integrity.json`. They are not
operational consumers. Empty or reconstructible caches are not authorities.

## Verification Strategy

Tests assert product behavior, not source strings or incidental keys. Habitat
and GritQL enforce structure and legal dependency directions. TypeScript checks
context narrowing and contract/client agreement.

Required deterministic proofs:

- one target-owned exact-tuple fixture proving TypeBox -> native oRPC contract
  and context -> effect-oRPC handler -> declared/unknown/defect/interruption
  behavior and runtime acquisition/disposal;
- `cells.inspect` over Missing, Running, SolverTerminal, and Evaluated without
  writes or new experiment-subject acquisition, using an inspect-capable runtime
  closure that does not require healthy run-only providers;
- local duplicate, restart, adoption, distinct-cell overlap, both provider
  lookup crash windows, recovery-namespace mismatch refusal, solver-exit
  recovery, persistence-unknown read-before-effect, preterminal/postterminal
  cleanup uncertainty, `CellRunInProgress` retry semantics, noncompletion, and
  no-valid-submission terminals;
- terminal-before-destructive-solver-release/verification and
  evaluation-before-destructive-evaluator-release/projection ordering;
- evaluator-exit-before-persistence adoption and interrupted-without-outcome
  rerun from the exact terminal, plus unknown/possibly-completed refusal,
  without repeating completed evaluator work;
- fresh solver-inaccessible evaluator reconstruction with hidden verifier and
  rubric inputs absent from the solver subject;
- native Git revision/subtree, allowed text/binary/add/delete/rename/mode
  patching, empty patch, base/mapping mismatch, fresh apply, and product-tree
  equality;
- process cancellation/termination and resource cleanup through real local
  fixture processes;
- OpenShell/Codex/observation behavior through model-free fixture providers and
  captured data, with no provider/account/gateway mutation;
- one retained model-free oRPC study cell and Inngest S09 through the same
  service boundary, with study content and evidence left in place.

Each source slice must pass its activated Habitat packet, Nx lint, typecheck,
behavior tests, build, and required dependency graph. A provider-only dead
tranche and a permanent compatibility shim both fail the slice.

## Green Slice Sequence

Source work remains blocked until both hard prerequisites in the authority
table are canonical.

1. **Inspect/store:** scaffold the canonical service/cells shell,
   service-owned cell schema/repository/migrations, generic persistence
   resource/provider, and read-only `cells.inspect`; prove the inspect-capable
   runtime closure without healthy run-only providers.
2. **Recovery core:** add `cells.run`, direct transitions, deterministic lookup
   identities, re-entry/refusals, and crash-window tests using injected
   model-free resources.
3. **Git/process:** add process/Bun and native Git resources/providers and close
   one artifact-producing cell path.
4. **Sandbox/agent:** add separate OpenShell and Codex resources/providers and
   close create-or-adopt, cancellation, recovery, and terminal persistence.
5. **Evaluation/observation:** add fresh isolated verification/evaluation and
   the observation/telemetry resource/provider, durable evaluation, and
   non-authoritative projection/runtime diagnostics.
6. **CLI/runtime projection:** select the CLI plugin in HQ, add the HQ runtime
   profile selections, and prove the full app/profile -> runtime -> service ->
   cells -> oRPC context funnel.
7. **Consumer transition:** pass retained oRPC and S09 model-free cells without
   moving their cases or evidence.
8. **Deletion:** remove `@rawr/research-sdk`, superseded active consumer
   machinery, package rules, and compatibility code; preserve frozen historical
   evidence.

Before landing, restack onto then-current canonical Template, recheck the
service tuple and provider pins through the repository lock/profile manifests,
run the full deterministic gate, and obtain exact-commit acceptance.

## Design Falsifiers

The design is wrong if:

- experiment state, repositories, migrations, or execution remain package-owned;
- a study owner or CLI plugin wires providers, supplies persistence, or
  sequences service internals;
- a service/resource/provider selects or provisions itself;
- a provider interprets cell transitions, study policy, or evaluation meaning;
- handlers can reopen app/profile/root dependency bags;
- `cells.inspect` mutates state or provider subjects;
- a recoverable solver is rerun, a live cell is replaced, or downstream failure
  erases terminal/evaluation truth;
- a provider recovery-namespace mismatch reaches a subject effect;
- telemetry determines correctness;
- a composite provider, dedicated app, async projection, operation journal, or
  package appears without its recorded falsifier, or a third operation merely
  exposes an internal stage;
- frozen evidence must move to use the service;
- source begins before both canonical prerequisites exist.
