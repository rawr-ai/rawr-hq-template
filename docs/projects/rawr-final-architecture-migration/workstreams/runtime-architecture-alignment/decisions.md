# Decisions — Runtime-Architecture Alignment Workstream

Status: Phase 0 complete (2026-05-04). Five DRA-default decisions locked + Decision #2 (OpenShell) resolved at user gate as Option B + four workstream-level execution-scope decisions locked. Phase 1 unblocked.

This document is the canonical record of every user-decision item from §5 of `runtime-architecture-alignment-plan.md` plus workstream-level execution-scope choices not surfaced in §5 but required to begin Phase 1.

For each decision, the entry records: the question, the options considered (verbatim from the plan), the option chosen, the rationale, and the downstream effect on cohort sequencing or output shape.

---

## Plan §5 user decisions

### Decision #1 — Registry placement (§10.14 vs new top-level §21)

**Question:** Should the new companion-spec attachment-points registry sit at arch-spec §10.14 (closing subsection of the Runtime realization chapter) or at a new top-level section §21 (after the closing canonical-picture diagram)?

**Options:**
- **A — §10.14 (plan recommended):** smaller ToC diff; reads naturally as closing subsection of runtime-realization chapter; ten of eleven rows are runtime-realization-adjacent.
- **B — new top-level §21:** signals the registry governs ALL future companion specs; more visible to ToC scanner; scales when companion specs proliferate.

**Chosen:** **Option A (§10.14).**

**Rationale:** the plan's recommendation conditions Option B on "platform expects multiple non-runtime-realization companion specs to materialize within the next two release cycles." The current Future Intake (`SPEC_UPDATE_BACKLOG.md`) has no such commitment; deployment / observability / profile / OpenShell companion specs are deferred-inventory items, not scheduled deliverables. Option A is the conservative choice and supports shipping the structural cohort with minimal disruption.

**Downstream effect:** registry lives at §10.14. Lane 1.2 in Phase 1 inserts §10.14 immediately after §10.13 and before the §10 closing divider.

---

### Decision #2 — OpenShell vendor status

**Question:** Is OpenShell (a) RAWR-internal, (b) third-party, or (c) formally deferred to a forthcoming OpenShell companion specification?

**Options:**
- **A — Declare RAWR-internal:** simplifies integration story; commits platform to building/maintaining OpenShell internally; requires internal-spec at `packages/core/runtime/harnesses/agent/openshell/` and a §10.14 registry row noting OpenShell's internal scope.
- **B — Declare third-party with vendor integration contract:** parallels treatment of Inngest/oRPC/Effect/Elysia/OCLIF/Bun; requires a third-party-vendor governance contract that doesn't exist yet; requires identifying or building the third-party OpenShell vendor.
- **C — Formally defer to a forthcoming OpenShell companion spec (plan recommended, but borderline):** honors the runtime-spec L4637 reserved-detail-boundaries pattern; lets §10.14 carry an explicit placeholder row noting reserved-detail-boundary status. Stronger con: OpenShell is the named substrate beneath the agent role (one of six canonical RAWR roles); deferring its vendor status is more load-bearing than deferring "telemetry sink choice" or "RuntimeCatalog storage backend."

**Chosen:** **Option B (third-party with vendor integration contract).**

**Rationale:** user resolution at Phase 0 user gate (2026-05-04). User selected Option B over the plan's Option C recommendation. Treating OpenShell as a third-party vendor parallels the existing platform treatment of Inngest, oRPC, Effect, Elysia, OCLIF, and Bun — all named as third-party vendors with explicit integration contracts at §13.x — and avoids the load-bearing risk the plan flagged for Option C ("ships an integration document with a structurally undefined substrate beneath one of its six canonical roles"). The cost — authoring a third-party vendor governance contract that doesn't exist yet — is absorbed by Phase 1 Lane 1.3 with an extended §13.5 contract paragraph, and the "identify or build the third-party OpenShell vendor" follow-up becomes a deferred-inventory entry at closure.

**Downstream effect:**
- §10.14 registry stays at **11 rows** (no placeholder row added).
- Lane 1.3 (Rec #3, §10.12 + §13.x) extends its §13.5 paragraph to:
  - name OpenShell as a third-party vendor (parallel to Inngest at §13.2);
  - add a third-party-vendor integration contract paragraph naming input boundary type (`MountedSurfaceRuntimeRecord` for agent harness), output type (`StartedHarness`), what RAWR owns vs what the OpenShell vendor owns (governance model + agent-role substrate + policy envelope), and a cross-reference to runtime-spec §21.5;
  - explicitly call out that the OpenShell vendor identity (which third-party implementation) is reserved-detail-boundary status, locks at first implementation slice — but the **vendor-contract shape** is now locked at this alignment release.
- Existing §12 (OpenShell posture, arch-spec L2022–L2046) gains a cross-reference to the new §13.5 vendor contract paragraph.
- Existing arch-spec L1398–L1399 + runtime-spec L4322 "reserved boundary with locked integration hooks" phrasing is preserved (the boundary remains reserved at the role level; what changes is that the *vendor governance contract* now exists at §13.5).
- Closure deferred-inventory: "Identify or build the third-party OpenShell vendor; audit §13.5 vendor contract against the chosen vendor when an implementation slice triggers."

---

### Decision #3 — Inngest mode default

**Question:** Should the arch-spec declare serve-mode the default Inngest integration mode?

**Options:**
- **A — Declare serve-mode the default:** matches current lab and production usage; gives downstream consumers a default to assume. Locks the architecture into a topology assumption (inbound HTTP) that may change; defaults at architecture level pre-empt profile/deployment companion-spec authority.
- **B — Declare no default (plan recommended):** keeps the architecture mode-neutral; leaves default-selection to the future deployment companion spec. Requires the arch-spec to be explicit that there is no default.
- **C — Declare serve-mode with connect-worker reserved:** matches reserved-detail-boundary discipline; serve-mode is the only mode under proof in the lab. Defaults at architecture level still pre-empt profile/deployment companion-spec authority.

**Chosen:** **Option B (no default at architecture level).**

**Rationale:** mode-selection is a profile/deployment concern that belongs in a future deployment companion spec. The plan's recommendation is explicit: "Defaults at architecture level pre-empt profile/deployment companion-spec authority." Naming both modes without a default is mode-neutral and forward-compatible.

**Downstream effect:** Lane 2.1 in Phase 2 inserts the §13.2 paragraph naming both modes without declaring a default; §17.8 invariant captures mutual-exclusion-per-process.

---

### Decision #4 — Minimal-viable harness-mount types subset (3 vs 7)

**Question:** Should arch-spec §10.12 name the full 7-type subset or the 3-type minimum?

**Options:**
- **A — Full 7-type (plan recommended):** `CompiledSurfacePlan`, `FunctionBundle`, `MountedSurfaceRuntimeRecord`, `HarnessDescriptor`, `StartedHarness`, `ExecutionRegistry`, `PortableRuntimePlanArtifact`. Gives companion harness specs the full integration vocabulary; aligns with per-name rule's commitment. Seven names is more spec-vocabulary surface than three.
- **B — 3-type minimum:** `HarnessDescriptor`, `StartedHarness`, `FunctionBundle`. Smaller change set; easier first read. Leaves four named types in runtime-spec territory that companion specs probably still need to reference.

**Chosen:** **Option A (full 7-type subset).**

**Rationale:** the per-name rule's commitment is the load-bearing principle (Rec #6 only makes sense relative to it). Naming all seven types in arch-spec §10.12 is the rule's first concrete application; downsizing to 3 leaves the rule under-applied and creates "is this name in arch-spec or not?" ambiguity for future companion-spec authors.

**Downstream effect:** Lane 1.3 in Phase 1 names all seven types in §10.12 + §13.1–§13.6 per-harness contract paragraphs.

---

### Decision #5 — `RuntimeDiagnosticContributor` row in §15.8

**Question:** Should arch-spec §15.8 add `RuntimeDiagnosticContributor` as a fifth row in the platform external interfaces table?

**Options:**
- **A — Add as 5th row:** completeness. Conflates two categories of named entity (resource-authored vs system-authored).
- **B — Omit (plan recommended):** keeps the 4-row table coherent (all four rows are system-produced, system-consumed external interfaces).

**Chosen:** **Option B (omit).**

**Rationale:** `RuntimeDiagnosticContributor` is resource-authored (services emit diagnostic contributions), not system-authored (the runtime emits `RuntimeDiagnostic` records). Mixing categories blurs the table's purpose.

**Downstream effect:** Lane 1.4 in Phase 1 inserts §15.8 with exactly 4 rows.

---

### Decision #6 — Runtime-spec §29 supersession scope

**Question:** Does the runtime-spec §29 supersession clause's scope ("older indexed runtime/effect documents") include the arch-spec on runtime mechanics?

**Options:**
- **A — Supersession includes arch-spec runtime sections:** gives runtime spec unambiguous authority over runtime content even where arch-spec contradicts it. Collapses names-vs-mechanics distinction.
- **B — Supersession excludes arch-spec; arch-spec defers via own scope language (plan recommended):** aligns with Recommendation #1; arch-spec's reworded §1 explicitly defers mechanics; runtime spec doesn't need to supersede.

**Chosen:** **Option B (excludes arch-spec).**

**Rationale:** Option B is the natural consequence of Rec #1 shipping. The arch-spec is an adjacent canonical document, not an older one — both are in active development. Collapsing names-vs-mechanics via Option A would erase the per-name rule's whole framework.

**Downstream effect:** runtime-spec §29 left untouched; the arch-spec's §1 scope rewrite (Rec #1, Lane 1.1) carries the mutual-deference contract.

---

## Workstream-level execution-scope decisions

These are not in §5 of the alignment plan but are required to lock Phase 0 design.

### W-1 — Cohort sequencing

**Question:** Ship structural cohort + cleanup cohort as one PR or two PRs?

**Chosen:** **One PR (per user input at plan exit).**

**Rationale:** the alignment plan's "one-release adoption is also valid" alternative; the dependency lattice between recs (registry rows reference names introduced by other recs; carve-out wording justifies compressions) means intermediate states are inconsistent.

**Downstream effect:** single feature branch `align-arch-spec-with-runtime-realization`; one commit per landed lane (or per landed sub-edit); PR opens at Phase 4 close.

### W-2 — Rec #7 source-of-truth direction

**Question:** Option A (arch-spec quotes runtime-spec L37–L47 verbatim, accepting drift risk) or Option B (arch-spec authors law at §4.0; runtime-spec L37–L47 cross-references arch-spec)?

**Chosen:** **Option B (arch-spec authors; runtime-spec cross-refs).**

**Rationale:** aligns with Rec #1 carve-out ("arch-spec owns canonical names and integration-boundary vocabulary"); avoids the drift-risk objection the plan flags; cleaner long-term posture.

**Downstream effect:** Lane 2.3 in Phase 2 (a) writes new §4.0 in arch-spec containing the compact ownership statement (verbatim wording adopted from runtime-spec L37–L47), (b) edits runtime-spec L37–L47 to add a cross-reference to arch-spec §4.0 as the canonical source.

### W-3 — Rec #6 borderline names (`Process*HubResource` types)

**Question:** Name the four named RAWR-owned coordination resources (`ProcessQueueHubResource`, `ProcessPubSubHubResource`, `ProcessConcurrencyLimiterResource`, `ProcessCacheHubResource`) in arch-spec, or leave them runtime-spec-only?

**Chosen:** **Do NOT name in arch-spec.**

**Rationale:** the plan's borderline-default-to-runtime rule. No deployment companion spec currently exists that maps process-local queues to deployment-platform queues. When that companion spec triggers, the names will be promoted into §10.14; until then they stay runtime-spec-only.

**Downstream effect:** Lane 2.2 in Phase 2 compresses §10.6 + §17.6 without naming any of the four resources; the AFTER text refers to them only by category ("named RAWR-owned process-local coordination resources are defined in the runtime realization specification, §14").

### W-4 — Rec #4 borderline name (`PortableRuntimePlanArtifact`)

**Question:** Name `PortableRuntimePlanArtifact` in §15.8 even though no external (non-runtime) consumer companion spec exists today, or wait?

**Chosen:** **Name now in §15.8.**

**Rationale:** runtime-spec L3437 already explicitly lists the consumer class as "runtime compiler, diagnostic tooling, topology export, and deployment/control-plane touchpoints" — the external consumer surface is named in the canonical runtime spec even if companion specs implementing those consumers do not yet exist. The §15.8 table's purpose is to be the integration registry future companion deployment/observability/control-plane specs attach to; pre-naming is the table's function.

**Downstream effect:** Lane 1.4 in Phase 1 names `PortableRuntimePlanArtifact` as the first row of the §15.8 table; also names it in §10.12 (Lane 1.3) per Rec #3.

---

## Decision summary table

| # | Topic | Chosen | Status |
|---|---|---|---|
| 1 | Registry placement | A (§10.14) | Locked |
| 2 | OpenShell vendor status | B (third-party with vendor contract) | Locked (user) |
| 3 | Inngest mode default | B (no default) | Locked |
| 4 | Harness type subset | A (full 7) | Locked |
| 5 | `RuntimeDiagnosticContributor` row | B (omit) | Locked |
| 6 | Runtime-spec §29 supersession | B (excludes arch-spec) | Locked |
| W-1 | Cohort sequencing | One PR | Locked (user) |
| W-2 | Rec #7 direction | B (arch-spec authors) | Locked |
| W-3 | `Process*HubResource` names | Do NOT name in arch-spec | Locked |
| W-4 | `PortableRuntimePlanArtifact` name | Name now in §15.8 | Locked |

Phase 1 begins after Decision #2 is resolved.
