# Runtime Realization Research Program

Status: bounded default program sequence closed and submitted through the
program closeout workstream.

This document is the program map for burn-down work inside the contained
runtime-realization lab. It is informative operating guidance for lab
coordination. It is not runtime architecture authority, not a production
implementation plan, and not the future RAWR Workstream System.

## Objective

Build a contained parallel runtime that exercises the load-bearing runtime
realization spine closely enough to:

- test accepted runtime shapes before migration depends on them;
- expose unresolved design as explicit negative space;
- keep proof, vendor proof, simulation proof, migration-only work, and
  production readiness separate;
- generate useful input packets for the next workstream without relying on chat
  history.

The canonical runtime spec pinned in `proof-manifest.json` remains the
architecture authority. The lab may reveal spec gaps, but it must not silently
decide them in fixtures or helper code.

On 2026-04-30 a user control input identified that the repo-pinned spec was
stale. The repo copy now matches the external locked snapshot at
`483044fa2082b75a89bc2a9da086e35a9fdd9cb91fd582415d8b3744f3e4f94b`.
Future proof promotion must refresh against that snapshot and its lock
authority/stale-source handling section.

## DRA Continuity Anchor

The DRA workflow is this research program workflow. During the default program,
the DRA kept moving through the domino sequence until the bounded sequence was
complete, reviewed, submitted, and clean. A completed workstream or PR was only
a checkpoint; the closeout report is the completion artifact for this bounded
program. After compaction, interruption, or conflicting context, refresh this
document, `dra-runtime-research-program-workflow.md`, the latest workstream
packet, the manifest, and the diagnostic, then continue only from an active
residual packet or explicit production migration workstream. Do not treat this
closeout as production runtime readiness.

## Current Baseline

The middle-spine workstream closed in PR #258 and produced simulation-level
confidence in the already-specified middle of the spine:

- explicit lab declarations derive normalized graph artifacts, descriptor refs,
  service binding plans, surface plans, dispatcher descriptor inventory,
  refs-only portable artifacts, compiled plans, provider graph diagnostics,
  registry input, harness placeholders, topology seed, and bootgraph input;
- fake bootgraph modules prove dependency ordering, rollback of started modules,
  reverse finalization, failed-finalizer records, and redacted lifecycle/catalog
  records;
- runtime access and service binding cache proof covers sanctioned access,
  explicit lab service dependency graph validation, dependency-before-dependent
  binding construction, construction-time structural cache identity, and
  invocation exclusion;
- native-shaped server callback and async bridge payloads delegate through
  `ProcessExecutionRuntime` in the contained mini runtime;
- deployment handoff rejects descriptor tables, executable closures, runtime
  access, live handles, app id mismatches, and raw secret fields.

The baseline is still not production runtime readiness. The diagnostic remains
the status view for red/yellow/green risk.

## Program Controls

| Control | Rule |
| --- | --- |
| Output contract gate | Every workstream starts with required outputs, non-goals, proof target, expected gates, and closure rule. |
| Authority triangulation gate | Current spec, proof manifest, diagnostic, previous workstream report, and stale migration inputs are separated before implementation. |
| Skill lens gate | The host selects only the useful skills for the workstream and records why; broad skills are tools, not mandatory ceremony. |
| Refresher gate | Before opening a workstream and after context compaction or long interruption, the host refreshes this program and the phased workflow unless they are fully confident the active state is already loaded. |
| Negative-space gate | Every `xfail`, `todo`, or out-of-scope item has an authority home, unblock condition, re-entry trigger, and next eligible workstream. |
| Proof-strength gate | `proof`, `vendor-proof`, and `simulation-proof` remain distinct; production-readiness wording cannot depend on vendor or simulation evidence. |
| Semantic-comment gate | The trailing comment review can require repair or preserve migration guidance, but comment presence cannot promote proof; promotion still needs a named gate and manifest/diagnostic agreement. |
| Review loop gate | Leaf loops run before parent architecture/migration/DX/adversarial judgment. |
| Promotion gate | Proof promotion requires a real oracle, a named regression gate, and manifest/diagnostic agreement. |
| Decision-packet gate | If an experiment chooses an API or law with downstream consequences, stop promotion and emit a decision packet or spec patch proposal. |
| Invalidation gate | New plan revision, artifact change, spec hash drift, parent-review failure, or governance decision invalidates affected loops explicitly. |
| Handoff gate | Closure requires final output, deferred inventory, verification, repo state, and a next workstream packet. |

## Domino Map

| Order | Workstream | Primary target | Keep fenced |
| --- | --- | --- | --- |
| 1 | ProviderEffectPlan -> Bootgraph/Provisioning Lowering | Replace fake provider lifecycle with a minimal acquire/release plan lowered through bootgraph and real Effect-backed provisioning behavior. | Retry/refresh policy, typed config binding, runtime-profile config redaction, redacted config snapshots, full boundary policy matrix, production providers, telemetry export, catalog persistence. |
| 2 | Provider Diagnostics + Runtime Profile Config Redaction | Prove config validation, secret use, redacted diagnostics, and no live secret leakage around provider acquisition. | Multi-source precedence, platform secret stores, export/persistence, production deployment config. |
| 3 | RuntimeResourceAccess Law + Service Binding DAG | Lock sanctioned runtime/resource access after provisioned values exist; validate service dependency graph and cycles. | Broad runtime handles, raw Effect access, semantic adapter taxonomy, service-local cache policy. |
| 4 | Dispatcher Access + Async Step Membership | Decide whether workflow dispatcher access is explicit or ambient and how workflows/schedules/consumers own statically declarable steps. | Inngest durable scheduling, final dispatcher operation API, real worker/serve behavior. |
| 5 | Server Route Derivation | Prove cold route factory derivation and import-safety artifacts before real server adapter claims. | Final route import-safety law, real HTTP path, OpenAPI publication, production Elysia lifecycle. |
| 6 | Real Adapter Callback + Async Bridge Lowering | Promote fake callback delegation into real native callback/async bridge lowering through `ProcessExecutionRuntime`. | Durable async semantics, full host lifecycle, deployment placement. |
| 7 | First Real Harness Mounts | Mount server and async harnesses first because they crack the production path most directly. | OCLIF, web, agent, desktop harnesses unless migration scope promotes them. |
| 8 | Boundary Policy Matrix | Lock timeout, retry, interruption, Exit/Cause, telemetry, redaction, and error mapping before migration-ready claims. | Product observability/export choices and external policy dashboards. |
| 9 | Semantic Runtime Documentation Harvest | Mine the lab TypeScript/runtime seams for high-signal JSDoc that is likely to be copied into the real implementation or useful as partial migration guidance. | Mechanical comments, final public API blessing, doc-only proof promotion, or comments that hide unresolved design. |
| 10 | Runtime Telemetry + HyperDX Observation | Use the available Docker HyperDX stack as a contained telemetry/export observation cycle for already-redacted runtime records. | Product observability/query policy, persisted catalog authority, production deployment placement, durable async semantics, and vendor strategy beyond the contained lab. |
| 11 | Migration/Control-Plane Observation | Carry summaries into future catalog-persistence and deployment-placement decision packets after telemetry shape is proven or explicitly fenced. | Lab-only proof of production storage, control-plane placement, and durable infra behavior. |

The domino order can change only through a workstream control input: new evidence,
explicit replan, blocker, or accepted architecture decision.

Closeout status:

- The default domino map is closed through PR #271.
- PRs #258-#271 are submitted and locally verified, but they are not merged into
  trunk at closeout time.
- The closeout workstream is coordination/out-of-scope and does not add runtime
  proof.

The HyperDX workstream is optional only if boundary-policy or harness-mounting
evidence proves it is premature. Its default target is contained observation:
can the runtime project already-redacted records into stable telemetry payloads
and emit them to local OTLP ingest without claiming product dashboards, query
policy, durable storage, or production readiness?

The Semantic Runtime Documentation Harvest is proof-adjacent but not proof. It
exists because the lab is now accumulating runtime seams that may be copied into
production. The harvest should preserve useful semantic JSDoc for lifecycle
authority, lab-only/private seams, record-only telemetry, exact boundary kinds,
redaction, interruption, provider/harness lifecycle, and negative space. It must
not add mechanical comments or convert unresolved design into apparent API law.

## Negative-Space Re-Entry Ledger

| Entry | Status | Why fenced now | Authority home | Unblock condition | Re-entry trigger | Next eligible workstream | Lane |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `audit.p0.async-step-membership` | `xfail` | Explicit lab owner-to-step membership artifacts are proven, but final public workflow/schedule/consumer membership metadata syntax remains unresolved. | Manifest, diagnostic, todo fixture, dispatcher/async workstream report. | Architecture accepts the final public membership channel or revises it explicitly. | Async bridge proof needs public authoring syntax rather than contained refs. | Async bridge workstream or spec decision packet | spec |
| `audit.p1.provider-effect-plan-shape` | `xfail` | Acquire/release payload, diagnostics, error, telemetry, policy metadata, and public lowering fields are not fully locked. | Manifest, diagnostic, todo fixture. | Public runtime API work requires final producer/consumer fields instead of lab-internal plan storage. | A later workstream would need public fields rather than private internals. | Spec decision packet or Boundary Policy Matrix | spec |
| `audit.p1.effect-managed-runtime-substrate` | `xfail` | Vendor behavior and contained provider execution are proven, but the final RAWR-owned substrate contract remains open. | Manifest, spine map, todo fixture. | Harness or boundary policy work needs named runtime-substrate lifecycle/API commitments. | Provider, harness, or policy proof needs substrate names beyond internal `EffectRuntimeAccess`. | Boundary Policy Matrix or First Real Harness Mounts | lab/spec |
| `audit.p1.process-local-coordination-resources` | `xfail` | Vendor primitives are local only; final RAWR resource contracts remain open. | Manifest, spine map, todo fixture. | A workstream chooses which queues/pubsub/cache/concurrency values are sanctioned runtime resources. | Runtime access or provider lowering needs queues/pubsub/cache/concurrency as sanctioned runtime resources. | RuntimeResourceAccess Law + Service Binding DAG | lab/spec |
| `audit.p1.provider-effect-plan-lowering` | `simulation-proof` | Contained lab lowering now exists, but it is not final public plan shape or production bootgraph integration. | Manifest, diagnostic, provider workstream report. | Production bootgraph or public API work needs to consume the proof without reusing private internals as architecture. | A future workstream tries to promote provider lowering into production harness or public SDK shape. | First Real Harness Mounts or spec decision packet | lab/spec |
| `audit.p1.effect-boundary-policy-matrix` + `audit.p1.effect-boundary-policy-matrix.residual` | `simulation-proof` + `xfail` | Contained executable/provider boundary policy records now preserve exact boundary kind, timeout metadata, retry-attempt declaration without scheduling, AbortSignal interruption propagation/classification, Effect Exit/Cause classification, record-only telemetry metadata, and redacted attributes. Final public policy API/DX, production retry/backoff, durable async policy, native host error mapping, HyperDX export/query, and catalog persistence remain open. | Manifest, diagnostic, todo fixture, boundary policy workstream report. | Production policy work needs public syntax, host mapping, scheduler behavior, or telemetry exporter semantics rather than record-only lab traces. | Migration or host work would otherwise treat contained policy records as production policy. | Runtime Telemetry + HyperDX Observation or Migration/Control-Plane Observation | lab/spec/migration |
| `audit.p1.safe-effect-composition-surface` | `xfail` | Curated helper list and names remain open beyond the proven current facade. | Manifest, spine map, todo fixture. | Public or pseudo-public authoring code needs a stable helper set or DX simplification. | Public/DX review finds Effect authoring ceremony or capability loss. | Boundary Policy Matrix | spec |
| `audit.p1.dispatcher-access` | `xfail` | Explicit lab dispatcher operation inventory is proven, but final explicit-vs-ambient dispatcher access policy and public SDK/DX shape remain unresolved. | Manifest, diagnostic, todo fixture, dispatcher/async workstream report. | Architecture accepts final dispatcher access policy or revises it explicitly. | Server or async work needs public dispatcher facade semantics rather than contained operation inventory. | Server Route Derivation, Boundary Policy Matrix, or spec decision packet | spec |
| `audit.p1.runtime-resource-access` | `xfail` | Mini runtime proves a narrow sanctioned facade and service binding DAG behavior, but final method law is not locked. | Manifest, diagnostic, todo fixture. | Architecture accepts the final method law or revises it explicitly. | Adapters, dispatchers, or harnesses need methods beyond the lab facade. | Dispatcher Access + Async Step Membership or Boundary Policy Matrix | spec |
| `audit.p2.server-route-derivation` | `simulation-proof` + `xfail` | Lab-local cold route factories now derive server route descriptors and refs-only artifacts without executing route bodies, but final public route import-safety law and production route module topology remain unresolved. | Manifest, diagnostic, todo fixture, server route workstream report. | Native adapter lowering needs to consume route descriptors or production SDK work needs final import-safety law rather than lab metadata. | Server adapter proof would otherwise execute route bodies, infer route factories unsafely, or treat lab-only route metadata as production law. | Real Adapter Callback + Async Bridge Lowering, First Real Harness Mounts, or spec decision packet | lab/spec |
| `audit.p2.adapter-effect-callback-lowering` | `simulation-proof` + `xfail` | Lab-local native-shaped server callback payloads now consume pre-derived route descriptors/refs and delegate through `ProcessExecutionRuntime`, but production Elysia/oRPC callback lifecycle and final boundary policy remain open. | Manifest, diagnostic, todo fixture, adapter/async bridge workstream report. | Production harness work consumes the payloads without inventing callback policy. | A production proof needs native host callbacks rather than contained payload invocation. | Boundary Policy Matrix or migration/control-plane | lab/spec |
| `audit.p2.async-effect-bridge-lowering` | `simulation-proof` + `xfail` | Lab-local async bridge payloads now consume owner-to-step refs and delegate through `ProcessExecutionRuntime`, but native Inngest FunctionBundle/worker mounting, durable scheduling/retry/idempotency, and final async host policy remain open. | Manifest, diagnostic, todo fixture, adapter/async bridge workstream report. | First async harness workstream consumes the payloads without choosing durable host semantics. | A harness proof needs native async host bridge behavior rather than contained payload invocation. | First Real Harness Mounts or Boundary Policy Matrix | lab/spec |
| `audit.p2.production-harness-mounting` | `simulation-proof` + `xfail` | Lab-local server and async started harnesses now consume adapter payloads and delegate through `ProcessExecutionRuntime`, but production Elysia/oRPC/Inngest mounting, real HTTP/worker paths, other harness kinds, deployment wiring, durable async semantics, and final boundary policy remain open. | Manifest, diagnostic, todo fixture, first harness workstream report. | Production harness work needs native host APIs or deployment wiring rather than contained harness records. | Migration work would otherwise treat contained mini harnesses as production readiness. | Boundary Policy Matrix, Runtime Telemetry + HyperDX Observation, or migration/control-plane | lab/spec/migration |
| `audit.p2.first-resource-provider-cut` | `todo` | Catalog candidates are planning input, not canonical ids. | Manifest, spine map. | Provider lowering needs representative standard resources beyond fixture-only ids. | Provider diagnostics need a resource set that is no longer just fixture inventory. | Provider Diagnostics + Runtime Profile Config Redaction | lab/spec |
| `audit.p2.runtime-profile-config-redaction` | `simulation-proof` | Contained provider provisioning validates lab runtime-profile config through `RuntimeSchema`, fails closed with diagnostic-safe validation errors, records redacted config snapshots, and avoids secret/live-handle leakage. Production config precedence, secret-store integration, telemetry export, and catalog persistence remain fenced. | Manifest, diagnostic, spine map, provider diagnostics workstream report. | Production config binding or persisted observation needs source precedence, platform stores, or export/correlation semantics. | A migration or harness workstream tries to treat lab config maps as production config authority. | Boundary Policy Matrix or Migration/Control-Plane Observation | lab/spec/migration |
| `audit.semantic-runtime-jsdoc-harvest` | `out-of-scope` | Semantic comments were harvested as migration/documentation substrate, not proof. Future trailing comment passes remain part of each workstream's review loop. | Research program, DRA workflow, semantic documentation harvest report. | A later TypeScript/runtime workstream adds new semantic boundaries or finds comments that overclaim proof/API law. | Production migration or implementation work would benefit from lab comments that explain lifecycle/authority seams. | Any runtime workstream's semantic trailing pass | documentation/migration |
| `audit.telemetry.hyperdx-observation` | `simulation-proof` | Contained lab projection/export now takes already-redacted process, provider, and catalog records, preserves useful runtime identity, rejects live handles/raw secrets/provider values/runtime access objects, builds stable OTLP trace payloads, and emits to local HyperDX/OTLP ingest. | Manifest, diagnostic, telemetry export helper/test, and HyperDX workstream report. | Production telemetry work needs host-native bootstrap, query policy, persistence, or product observability semantics rather than contained projection/export. | Migration/control-plane or host work tries to treat local OTLP smoke as production observability readiness. | Migration/Control-Plane Observation | lab/migration |
| `audit.telemetry.hyperdx-observation.residual` | `xfail` | Product observability policy, dashboard/query policy, retention, alerting, correlation naming, production OpenTelemetry bootstrap, persisted RuntimeCatalog storage, deployment/control-plane placement, native host telemetry, durable async run history, platform secret-store precedence, and arbitrary diagnostic string redaction remain unresolved. | Manifest, telemetry workstream report, canonical spec sections 22, 23.3, 23.5, and 29. | Architecture accepts observability/export/query/persistence policy or migration requires it. | Production host or migration work needs telemetry semantics beyond contained OTLP export. | Migration/Control-Plane Observation or decision packet | spec/migration |
| `audit.migration.control-plane-observation` | `simulation-proof` | A contained, non-persistent packet now summarizes already-safe deployment handoff, in-memory catalog, redacted telemetry records, export status, and candidate-only placement hints for migration review while preserving app/run/trace/correlation identity and rejecting live/raw authority-bearing values. | Manifest, diagnostic, migration/control-plane workstream report, helper/test. | Future migration work needs durable storage, placement policy, query policy, orchestration, or production host semantics rather than packet summaries. | A future implementation treats the packet as production storage, placement readiness, query readiness, or migration completion. | Program closeout decision packet or production migration workstream | lab/migration |
| `audit.migration.control-plane-observation.residual` | `xfail` | RuntimeCatalog persistence, indexing, retention, rehydration, exact storage format, control-plane topology, deployment placement, orchestration, product query/dashboard policy, production OpenTelemetry bootstrap, native host telemetry, durable async history, platform secret-store precedence, production config order, and arbitrary DLP remain unresolved. | Manifest, diagnostic, migration/control-plane workstream report, canonical spec sections 22.3, 23.5, 24.2, and 27. | Architecture accepts storage/placement/query/topology policy or production migration implementation begins. | Migration agents need more than observation packet summaries. | Decision packet or production migration workstream | spec/migration |
| `audit.runtime-research-program-closeout` | `out-of-scope` | Closeout records that the bounded default sequence is submitted and locally verified; it adds no runtime behavior proof. | Manifest and closeout report. | A future residual decision packet or production migration workstream is explicitly opened. | A future agent treats this closeout as production readiness or as a reason to continue the automatic domino loop. | Explicit decision packet or production migration workstream | out-of-scope |
| `audit.source-hygiene` | `out-of-scope` | Stale source hygiene is migration preflight, not a type-spine proof. | Manifest. | Migration work is about to rely on indexed docs, source graphs, or stale extracted structure. | Migration agents start relying on indexed stale docs. | Migration/control-plane or source-hygiene workstream | out-of-scope |

No item may be removed from this ledger unless the manifest/diagnostic also
change or the item is explicitly superseded by a new authority entry.

## Standing Agent Topology

The host/DRI owns scope, branch state, authority order, agent prompts, conflict
resolution, final integration, proof promotion, and closeout.

Use fresh default agents when context carryover is not wanted. Give each agent
the objective, authority stack, relevant files, non-goals, and output format.

Each phase may use its own agent team. The host should staff the phase with the
smallest team that can produce independent evidence or patches, and may rotate
fresh agents inside a phase when the work splits into distinct lanes. Keep at
most 6 concurrent agents active for a workstream phase unless a future control
input changes the limit. Agent rotation is a tool for independence and coverage;
the host still owns synthesis, conflict resolution, and proof promotion.

The host may use skills as review lenses. Useful available lenses include
`solution-design`, `system-design`, `domain-design`, `api-design`, `typescript`,
`ontology-design`, `information-design`, `testing-design`, `architecture`,
`docs-architecture`, `team-design`, `nx-workspace`, and `graphite`. Select by
fit. Do not make every workstream load every lens.

For TypeScript-level reviews, the `typescript` skill should be paired with
professional TypeScript and refactoring references when useful:

- <https://refactoring.guru/design-patterns/typescript>
- <https://github.com/RefactoringGuru/design-patterns-typescript>
- <https://refactoring.guru/refactoring/techniques>

These references are review aids for SDK design taste, pattern vocabulary,
authoring ergonomics, and safe refactoring. They are not runtime architecture
authority.

| Lane | When to use | Output |
| --- | --- | --- |
| Authority cartographer | Every non-trivial workstream. | Source hierarchy, stale inputs, conflict rules, and spec gaps. |
| Mechanical verifier | Every implementation workstream. | Nx/project/paths/imports/Graphite/structural review. |
| Architecture reviewer | Any runtime spine, API, lifecycle, or ownership work. | Boundary risks, hidden second model checks, decision-packet triggers. |
| Vendor fidelity reviewer | Any Effect/oRPC/Inngest/TypeBox/Bun claim. | Version/API behavior and vendor-vs-RAWR proof boundary. |
| Evidence auditor | Every proof promotion. | Manifest, diagnostic, proof strength, oracle, and test-theater review. |
| Migration derivability reviewer | Before closeout. | Whether the result actually de-risks migration and what remains production-only. |
| DX/API/TypeScript reviewer | Any public or pseudo-public shape. | Authoring clarity, vendor alignment, inference quality, TypeScript surface discipline, capability preservation, and simplification opportunities. |
| Semantic JSDoc/comment trailing reviewer | After TypeScript or lab-runtime edits add semantic seams. | High-signal comments for lifecycle, authority, and proof-boundary seams; no mechanical narration or promotion of unresolved public contracts. |
| Workstream lifecycle reviewer | Before closeout, after compaction/resume, or whenever process drift appears. | Whether the workstream was opened, run, reviewed, closed, and handed off as intended, plus process-tension notes or concrete workflow/template repairs. |
| Adversarial reviewer | Before final submit. | False green, overfit fixtures, self-approval, missing re-entry triggers, and stale authority. |

Workers may implement bounded patches, but the host must verify their work with
reasoning or a paired review agent before promotion.

## Escalation Filter

Host-owned decisions:

- branch names and Graphite mechanics;
- doc placement inside this lab;
- fixture and test file placement;
- report/template wording;
- gate wiring and structural requirements;
- keeping existing fenced items fenced;
- selecting a minimal lab-only helper shape when it does not affect public API,
  runtime law, or migration topology.

Escalate to the user before promotion when a choice affects:

- public authoring API or DX contract;
- `ProviderEffectPlan` final producer/consumer shape;
- `RuntimeResourceAccess` final method law;
- dispatcher access policy;
- async step membership policy;
- cold route derivation/import-safety law;
- timeout, retry, interruption, telemetry, redaction, or error/exit policy;
- durable versus process-local semantics;
- vendor strategy or dependency posture;
- service/plugin/app/runtime ownership boundaries;
- production package topology or migration sequence.

When in doubt, continue with an experiment only if the report clearly says it is
not proof and gives the design decision an authority home.

## Required Workstream Closeout

A workstream is not closed until it has:

- required outputs present;
- focused gates and full gate status recorded;
- leaf and parent review results recorded;
- workstream lifecycle/process review recorded, including any tension notes or
  structural fixes needed before the next workstream;
- proof promotions or non-promotions reflected in the manifest/diagnostic;
- deferred inventory with authority homes, unblock conditions, and re-entry
  triggers;
- next workstream packet with one precise next action;
- clean repo and Graphite status, or an explicit blocker.

The final output of one workstream is the opening packet for the next.
