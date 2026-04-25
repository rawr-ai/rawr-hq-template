# Runtime Realization Candidate Evaluation

Status: Complete
Review packet: Runtime Realization Candidate Review, Alt-Y round
Verdict: Accept Candidate A as the baseline after bounded repairs

## Executive Decision

Candidate A should become the baseline Runtime Realization System specification for migration planning.

Candidate A is `/Users/mateicanavra/Downloads/RAWR_Runtime_Realization_System_Alt-Y-2.md`.

Candidate B is `/Users/mateicanavra/Downloads/RAWR_Runtime_Realization_System_Alt-Y-1.md`.

The `Alt-Y-1` and `Alt-Y-2` suffixes are mechanical labels only. They do not map to earlier alternate-spec numbering or authority.

All four specialist reviewers independently selected Candidate A with bounded repairs:

- Information Design: Candidate A is the clearer baseline and should be repaired, with specific Candidate B transplants.
- Architecture / Lock: Candidate A passes architecture hard gates; Candidate B has load-bearing runtime topology drift.
- Carry-Forward: Candidate A preserves the load-bearing runtime mechanisms more completely.
- Migration Derivability: Candidate A can drive M2/runtime migration planning after bounded repairs.

This outcome does not require another cloud synthesis run. It requires a local repair pass starting from Candidate A, plus named transplants from Candidate B after normalization to the Synthesis Lock.

## Candidate Metadata

| Label | Source | SHA-256 | Lines | Bytes | Heading count | Code fences | File labels | Layer labels |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Candidate A | `/Users/mateicanavra/Downloads/RAWR_Runtime_Realization_System_Alt-Y-2.md` | `a12e01a69e6d3add1ed2742e01c053156fea8b56993fe6e1bf63e89d5867dd61` | 2700 | 113263 | 95 | 128 | 64 | 64 |
| Candidate B | `/Users/mateicanavra/Downloads/RAWR_Runtime_Realization_System_Alt-Y-1.md` | `414df1e03a6749eb314609693bfe24c1a6f66e83e9be328b73341dcfca9fe731` | 2971 | 116608 | 64 | 144 | 72 | 72 |

Review inputs:

- Runtime Realization Synthesis Lock.
- GPT-5.5 Pro Runtime Realization Synthesis Prompt.
- Runtime Realization Implementation Grounding Excerpt.
- Alternative Runtime Realization Specification 1: `/Users/mateicanavra/Downloads/RAWR_Runtime_Realization_System-Alt-X-1.md`.
- Alternative Runtime Realization Specification 2: `/Users/mateicanavra/Downloads/RAWR_Runtime_Realization_System-Alt-X-2.md`.
- Candidate A and Candidate B.
- Extraction artifacts under `.context/.scratch/runtime-realization-candidate-review/extraction/`.

Authority model used during review:

- The Synthesis Lock is the sole architecture authority.
- The prompt is process and review guidance only.
- The alternates are carry-forward verification sources only.
- The Grounding Excerpt is quarantined service-internals realism only.
- Scratchpads, reports, and extraction artifacts are evidence for this review, not future synthesis authority.

## Hard Gate Results

Candidate A passes the hard gates.

Candidate A preserves:

- canonical topology under `packages/core/sdk`, `packages/core/runtime/*`, `resources/*`, `apps/<app>/runtime/*`, `services/*`, and `plugins/*`;
- `defineApp(...)` and `startApp(...)` as canonical app APIs;
- topology plus builder classification for plugin projections;
- service/plugin/app/resource/provider/SDK/runtime/harness/diagnostic ownership;
- lifecycle order `definition -> selection -> derivation -> compilation -> provisioning -> mounting -> observation`;
- `RuntimeSchema` as the SDK-facing runtime-carried schema facade;
- service binding over `deps`, `scope`, and `config`, with invocation excluded from `ServiceBindingCacheKey`;
- bootgraph, provisioning, runtime access, process runtime, adapter lowering, harness handoff, diagnostics, and shutdown as visible internal mechanics.

Candidate B is not acceptable as baseline as-is.

The main blocker is not broad architectural incompatibility. Candidate B is mostly lock-compatible in substance, but it repeatedly presents package/import/topology details in a way that can become migration authority:

- It introduces `packages/core/runtime/process`, `packages/core/runtime/access`, and `packages/core/runtime/adapters` as normative package roots across topology, imports, and examples.
- It uses bare `services/*`, `resources/*`, and `plugins/*` imports in ways that look canonical.
- It weakens exact artifact naming around `NormalizedAuthoringGraph` and `PortableRuntimePlanArtifact`.
- It softens or drops a few load-bearing carry-forward shapes, including explicit `RuntimeSchema.validate(...)` and `ServiceBindingPlan.invocationSchema`.

Candidate B should be mined, not adopted.

## Comparative Evaluation Matrix

| Dimension | Candidate A | Candidate B | Decision |
| --- | --- | --- | --- |
| Architecture correctness | Passes hard gates with localized repairs | Mostly compatible but topology/import drift is repeated | A |
| Carry-forward fidelity | Strong preservation of runtime artifacts and examples | Strong in spots, but drops or renames some locked artifacts | A |
| Component completeness | Strong component-first sections and contracts | Strong, but some concepts are split through alternate package buckets | A |
| Internal transparency | Clear authoring-to-runtime chains | Clear but more dependent on later sequence sections | A |
| Example quality | Strong service/API/internal/async examples; weaker CLI/web/agent/desktop examples | Stronger surface examples and full realization sequence | A with B transplants |
| Schema concreteness | Strong `RuntimeSchema` and schema-backed service/plugin contracts | Good, but `RuntimeSchema` facade is slightly softened | A |
| Information design | Better section scent and component-first organization | Useful prose, but more path/import drift | A |
| Migration derivability | Can drive M2 planning after repairs | Needs broader normalization before use | A |
| Stability/flexibility | Good reserved-boundary table and foundation matrix | Good final sequence; flexible table less complete | A with B transplants |
| Drift resistance | Higher | Lower due to topology/import/package labels | A |

## Selected Baseline

Select Candidate A.

Candidate A is closest to the Synthesis Lock as a canonical, standalone, normative document. It has the right architecture spine, preserves the right nouns, gives realistic examples, and exposes runtime internals well enough to derive implementation work.

Candidate A should be repaired locally before replacing the canonical runtime realization spec. The repair should not average Candidate A and Candidate B. Candidate B contributes named material only where it improves Candidate A without changing the Synthesis Lock.

## Required Repairs Before Adoption

These repairs are required before Candidate A becomes the migration baseline.

1. Rename `diagnosticView` vocabulary.

Use `diagnosticContributor`, `toDiagnosticSnapshot`, or another diagnostic-read-model name. Avoid `View` vocabulary near runtime access because the Synthesis Lock rejects `RuntimeView`, `ProcessView`, and `RoleView` as live-access names.

2. Clarify `WorkflowDispatcher` derivation and materialization.

Candidate A should state that SDK/runtime derivation produces dispatcher descriptors and async surface plans, while the live `WorkflowDispatcher` is materialized from selected workflow definitions plus the provisioned process async client. Server API/internal projections wrap dispatcher capabilities; async plugins do not expose product APIs directly.

3. Keep runtime access hooks sanctioned and redacted.

If `ProcessRuntimeAccess` includes topology or diagnostic emission hooks, they must be described as sanctioned redacted write hooks. They cannot mutate app composition, acquire resources, retrieve live values for diagnostics, or expose raw Effect/provider/config internals.

4. Normalize non-SDK import examples.

Keep `@rawr/sdk` as canonical. Treat plugin, service, and resource import paths as illustrative unless a package export convention is explicitly locked. Avoid making bare repo paths or unapproved aliases target authority.

5. Keep shutdown out of the top-level lifecycle chain.

Shutdown records, rollback, finalizers, and stop ordering are required runtime behavior, but the canonical lifecycle remains `definition -> selection -> derivation -> compilation -> provisioning -> mounting -> observation`. If shutdown appears in enums, label it as an observation/finalization record, not an eighth realization phase.

6. Add latest lock points to reserved boundaries.

Candidate A's reserved-boundary table has owner, package, hook, input, output, diagnostics, and enforcement. Add a `Latest lock point / dedicated spec pass condition` column so migration teams know when they must stop and specify the boundary before implementation proceeds.

7. Add diagnostics/enforcement coverage to the component summary.

Candidate A's component summary is useful for planning, but it should include or companion-map diagnostics and enforcement/migration gates for each load-bearing component.

8. Make examples-as-gates explicit.

Add a short section mapping the end-to-end examples to acceptance-gate categories: derivation artifact snapshot, compiler validation, provider coverage, bootgraph ordering, service binding cache, adapter lowering, harness mount, catalog/diagnostic record, and shutdown/rollback.

9. Clarify runtime access producer/consumer split.

Use wording like: "Provisioning produces access handles; process runtime consumes and scopes them for binding, projection, adapter handoff, and diagnostics."

## Transplant Ledger

Transplant these Candidate B materials into Candidate A only after normalizing to the Synthesis Lock.

| Candidate B material | Why to transplant | Normalization required |
| --- | --- | --- |
| `WorkflowDispatcher` section | It gives a clearer method-set and role contract | Preserve selected-workflow-plus-process-async-client derivation; keep server API/internal projections as wrappers |
| `RuntimeTelemetry` interface shape | It makes telemetry concrete enough for implementation planning | Keep runtime telemetry separate from service semantic observability |
| Full realization sequence | It is a useful audit checklist | Rewrite to the seven-phase lifecycle and Candidate A artifact names |
| Provider acquire/release example | It strengthens provider implementation realism | Normalize imports and keep provider implementation separate from resource/app/service ownership |
| CLI/web/agent/desktop examples | Candidate A is terse in these lanes | Normalize package labels and keep native interiors behind RAWR boundaries |
| Ownership-law prose | It is crisp and readable | Use as explanatory prose alongside Candidate A's table, without replacing the table |
| Shutdown-order language | It makes teardown concrete | Classify as runtime finalization/observation, not a new lifecycle phase |

Do not transplant Candidate B's `packages/core/runtime/process`, `packages/core/runtime/access`, or `packages/core/runtime/adapters` package-root posture unless a separate architecture decision explicitly locks that package taxonomy.

## Canonical Phrasing To Preserve

Preserve these phrases or equivalent wording in the repaired baseline:

- "Services own truth. Plugins project. Apps select. Resources declare capability contracts. Providers implement capability contracts. The SDK derives. The runtime realizes. Harnesses mount. Diagnostics observe."
- "Topology plus builder classifies projection identity."
- "`RuntimeSchema` is the canonical SDK-facing schema facade for runtime-owned and runtime-carried boundary schema declarations."
- "Service binding is construction-time over `deps`, `scope`, and `config`. Invocation is supplied per call and never participates in `ServiceBindingCacheKey`."
- "`FunctionBundle` is the async harness-facing derived/lowered artifact consumed by the Inngest harness."
- "`RuntimeCatalog` is a diagnostic read model, not a second manifest and not live access."
- "Surface adapters lower runtime-compiled `SurfaceRuntimePlan` artifacts or compiled surface plan artifacts, not raw authoring declarations or SDK graphs."
- "Harnesses consume mounted surface runtimes or adapter-lowered payloads. They do not consume SDK graphs or compiler plans directly."
- "Reserved boundaries are named architecture surfaces with locked owners and integration hooks. They are not omissions."

## Missing Or Weakened Architecture

Candidate A does not miss the foundational architecture. It needs tightening in a few places.

Localized weaknesses:

- `diagnosticView` can drift toward forbidden live view terminology.
- Dispatcher derivation needs a cleaner split between descriptors/plans and live process materialization.
- Surface examples for CLI, web, agent, and desktop are thinner than server/async examples.
- Reserved boundaries need latest lock points.
- Component summary needs diagnostics/enforcement columns or a companion gate matrix.
- Import examples should not accidentally lock package aliases beyond `@rawr/sdk`.

Candidate B weakens or drifts more substantially:

- runtime internal topology is split into package roots not stated by the Synthesis Lock;
- exact artifact names `NormalizedAuthoringGraph` and `PortableRuntimePlanArtifact` are not preserved;
- `RuntimeSchema` lacks an explicit validation operation in the main interface example;
- `ServiceBindingPlan` omits `invocationSchema`;
- bare repo-style imports look canonical;
- conceptual docs paths are presented as real package file paths in many places.

## Migration-Readiness Assessment

Candidate A is migration-ready as a baseline after bounded repairs.

It can drive:

- package and ownership planning under `packages/core/sdk`, `packages/core/runtime/*`, `resources/*`, `apps/<app>/runtime/*`, `services/*`, and `plugins/*`;
- M2 implementation slices for SDK derivation, runtime compiler, bootgraph/provisioning, process runtime, service binding, adapter lowering, harness mounting, diagnostics, and reserved follow-up boundaries;
- example-derived gates for service boundary, plugin projection, workflow dispatch, provider coverage, runtime access, catalog/diagnostics, and shutdown behavior.

Candidate B is not migration-ready as the baseline as-is. It is compatible enough to mine, but adopting it directly would make migration planning normalize around package/import choices that were not locked.

## Remaining Open Design Questions

No M2-blocking architecture question remains if Candidate A is selected.

Two follow-up choices should be resolved during the Candidate A repair pass:

1. Exact public import conventions beyond `@rawr/sdk`.

Candidate A uses `@rawr/services/*`, `@rawr/plugins/*`, and `@rawr/resources/*` examples. Decide whether those are canonical package exports or illustrative labels. If illustrative, say so explicitly.

2. Exact runtime internal child-directory taxonomy.

Candidate A uses `packages/core/runtime/process-runtime/*`. Candidate B uses separate `process`, `access`, and `adapters` directories. The Synthesis Lock requires these concerns under `packages/core/runtime/*` and as runtime-owned components, but does not itself lock the exact child directory spelling. Candidate A's grouping is the safer default unless a later implementation package design chooses a different taxonomy.

## Reviewer Report Summary

| Reviewer | Recommendation | Main reason |
| --- | --- | --- |
| Information Design | Candidate A with repairs | Better section order, heading scent, component-first structure, safer conceptual file labels, and stronger locked term preservation |
| Architecture / Lock | Candidate A with repairs | Candidate A passes hard gates; Candidate B's runtime topology split is load-bearing drift |
| Carry-Forward | Candidate A with repairs | Candidate A preserves `RuntimeSchema`, service binding, bootgraph/provisioning, runtime access, `FunctionBundle`, catalog, and examples more completely |
| Migration Derivability | Candidate A with repairs | Candidate A can drive migration planning; Candidate B needs normalization before it can be safely used |

All reviewer scratchpads recorded full reads of the Synthesis Lock, prompt, Grounding Excerpt, Alt-X-1, Alt-X-2, Candidate A, Candidate B, and extraction artifacts.

## Verification

Performed during the review:

- Candidate hashes and sizes recorded.
- Extraction artifacts created under `.context/.scratch/runtime-realization-candidate-review/extraction/`.
- Reviewer scratchpads and reports created under `.context/.scratch/runtime-realization-candidate-review/`.
- All four reviewer reports completed.
- All reviewer state logs reached `report-written`.
- DRI inspected the extraction evidence, candidate high-risk sections, and all reviewer reports.

Final recommendation:

Use Candidate A as the baseline, repair it locally, and transplant only the named Candidate B material after normalization to the Synthesis Lock.
