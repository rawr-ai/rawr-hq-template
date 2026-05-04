---
title: 'Depth investigation: platform external interfaces table'
id: depth-investigation-platform-external-interfaces-table
tags:
- runtime-canon-arch-align
- locus-platform-external-interfaces-table
created: '2026-05-02T21:22:59.671768Z'
status: draft
type: interim
deprecated: false
summary: Add arch-spec §15.8 'Platform external interfaces' — 4-row table naming PortableRuntimePlanArtifact,
  RuntimeCatalog, RuntimeDiagnostic, RuntimeTelemetry with consumer classes and runtime-spec
  section citations; amend §17.12 invariant to name all four artifacts.
---

# Interim report: platform-external-interfaces-table

**Locus question:** Should the canonical architecture spec introduce a 'platform external interfaces' table that names PortableRuntimePlanArtifact and RuntimeCatalog (and possibly RuntimeDiagnostic / RuntimeTelemetry) as the platform's formal control-plane / deployment / observation integration interfaces — and what does the table look like?
**Flavor:** technical

---

## What the corpus already said

The contradiction-graph cluster `portable-plan-artifact-as-control-plane-interface-missing` states the core gap cleanly: the runtime-spec (L3409–L3437, §15.7) explicitly names `PortableRuntimePlanArtifact` as the integration surface for "runtime compiler, diagnostic tooling, topology export, and deployment/control-plane touchpoints," while the arch-spec names `RuntimeCatalog` briefly at §10.13 (L1813–L1823) and mentions "control-plane touchpoints" at L2568–L2569 but never names `PortableRuntimePlanArtifact` at the architecture level. The source-analysis-runtime-spec.md §4.6 and §4.7 classify `PortableRuntimePlanArtifact` and `RuntimeCatalog` as "integration contracts" (not runtime-internal detail), and §6.6 + §6.7 identify their absence in the arch-spec as a gap. The source-analysis-arch-spec.md §4f and §4g describe the arch-spec's §15.7 as giving a control-plane record list without naming the artifact types that carry those records.

---

## What the new sources say

This locus has a source_budget of 3. Given that the corpus already contains the complete runtime-spec and arch-spec source files as vault notes, and the analysis documents already extract the exact line references needed, no external web fetches are required or warranted — the artifacts named in the locus question (`PortableRuntimePlanArtifact`, `RuntimeCatalog`, `RuntimeDiagnostic`, `RuntimeTelemetry`) are fully specified in the runtime spec at the cited line numbers. The budget of 3 is therefore consumed by direct reading of the two spec source files (already in-vault as `rawr-effect-runtime-realization-system-canonical-spec-source` and `rawr-canonical-architecture-spec-source`) and the runtime spec's §27 component contract summary table (L5087–L5130).

### Runtime spec §15.7 — PortableRuntimePlanArtifact (L3409–L3437)

Direct quote from the runtime spec:

> "Portable plan artifacts allow inspection, control-plane handoff, and reproducible runtime planning without live resources or executable closures."
>
> "This artifact is consumed by runtime compiler, diagnostic tooling, topology export, and deployment/control-plane touchpoints. It is not live access, not a manifest, and not an executable descriptor table." (runtime-spec L3437)

The artifact is produced by **SDK derivation** (placed at `packages/core/sdk/src/derivation/portable-runtime-plan-artifact.ts`). The runtime spec §27 component contract summary confirms: "Consumed by: Compiler/diagnostics/control-plane touchpoints. Phase: Derivation." The interface contains `roleSurfaceIndex`, `resourceRequirements`, `providerSelections`, `serviceBindingPlans`, `surfaceRuntimePlans`, `workflowDispatcherDescriptors`, `executionDescriptors` (refs only, not executable tables), and `diagnostics`.

**Integration constraint established by the runtime spec:** This artifact holds only `ExecutionDescriptorRef` entries (not the full `ExecutionDescriptorTable`), meaning it is genuinely portable — a deployment tool receiving only this artifact cannot execute; it can only inspect, plan, and forward to a runtime compiler.

### Runtime spec §22.1 — RuntimeDiagnostic (L4336–L4388)

> "`RuntimeDiagnostic` is a structured runtime finding, violation, status, or lifecycle event."
>
> "Diagnostics name the violated boundary or failed lifecycle phase. They explain; they do not compose." (runtime-spec L4388)

Produced by all runtime layers; consumed by diagnostics/catalog. The `boundary` field enumerates: `service | plugin | app | resource | provider | sdk | runtime-compiler | bootgraph | provisioning-kernel | process-runtime | execution-registry | execution-runtime | surface-adapter | harness | diagnostics`. The runtime spec §27 summary confirms: "Consumed by: Diagnostics/catalog. Phase: All phases."

### Runtime spec §22.2 — RuntimeTelemetry (L4392–L4468)

> "`RuntimeTelemetry` is the runtime-owned spans, events, annotations, and lifecycle telemetry chain."
>
> "Runtime telemetry provides process, provisioning, execution, and correlation context. Service semantic observability enriches semantic spans and events." (runtime-spec L4468)

Produced by runtime and harness integrations; consumed by "Diagnostics/observability exporters" (runtime-spec §27, L5128). The telemetry chain is normative (L4442–L4466): entrypoint → SDK derivation diagnostics → runtime compiler diagnostics → bootgraph spans → provider acquisition → RawrEffect execution → service binding → adapter lowering → harness ingress/egress → finalization.

### Runtime spec §22.3 — RuntimeCatalog (L4470–L4511)

> "`RuntimeCatalog` is the diagnostic read model of selected, derived, compiled, provisioned, bound, projected, executed, mounted, observed, and stopped topology."
>
> "Storage backend, indexing, retention, and exact persistence format are reserved. The minimum record sections are not reserved." (runtime-spec L4511)

Produced by the runtime and diagnostics subsystem; consumed by "Diagnostic readers/control-plane touchpoints" (runtime-spec §27, L5126). Placed at `packages/core/runtime/topology`. The minimum record sections include `processIdentity`, `appIdentity`, `entrypointIdentity`, `roles`, `resources`, `providers`, `lifecycleTimestamps/status`, `diagnostics`, `topologyRecords`, `startupRecords`, `executionRecords`, `finalizationRecords`.

### Arch spec §10.13 — current state (L1813–L1824)

The arch-spec currently describes all three observability constructs but does so in prose without naming them as formal integration interfaces with producer/consumer/constraint columns:

> "`RuntimeCatalog` is a diagnostic read model. It does not retrieve live values and does not become a second app composition file."
>
> "Runtime diagnostics are structured findings, violations, statuses, and lifecycle events."
>
> "Runtime telemetry carries process and provisioning context through [list]."

This is integration-level description but lacks the artifact table format, the explicit consumer-class naming, the runtime-spec section citation, and — critically — the `PortableRuntimePlanArtifact` entirely.

### Arch spec §15.7 — current state (L2554–L2568)

The arch-spec §15.7 is titled "Cache and control-plane boundaries" and addresses two separate topics: cache ownership (a useful table) and a one-sentence control-plane statement:

> "Runtime emits or consumes topology, health, profile, process identity, provider coverage, startup, finalization, diagnostics, telemetry, and catalog records at control-plane boundaries. Deployment and control-plane architecture own multi-process placement policy." (arch-spec L2568)

This sentence correctly states the principle but never names the artifact types through which those records flow.

### Arch spec §17.12 — current state (L2734–L2739)

> "There is no generic shadow control-plane layer by default."
>
> "The shell is not the control plane. The diagnostic/control seam lives in runtime topology, catalog, diagnostics, telemetry, and explicitly owned control-plane touchpoints." (arch-spec L2738)

This is the correct invariant but it does not name the specific artifact types, leaving the "explicitly owned control-plane touchpoints" phrase unmoored.

---

## Evidence synthesis

The evidence is consistent and non-conflicting. The runtime-spec (via §15.7, §22.1, §22.2, §22.3, and §27) provides four named artifacts with explicit consumer classes. The arch-spec (via §10.13 and §15.7 L2568) establishes the correct principle (runtime emits records at control-plane boundaries) but fails to name the four artifact types. The gap is not a contradiction — it is a naming omission at the architecture level.

**Consumer-class analysis from the runtime-spec §27 component summary:**

| Artifact | Consumed by (runtime-spec §27) |
|---|---|
| `PortableRuntimePlanArtifact` | Compiler/diagnostics/control-plane touchpoints |
| `RuntimeCatalog` | Diagnostic readers/control-plane touchpoints |
| `RuntimeDiagnostic` | Diagnostics/catalog (all phases) |
| `RuntimeTelemetry` | Diagnostics/observability exporters (all phases) |

The key structural point: `PortableRuntimePlanArtifact` is the **pre-runtime** external interface (produced at derivation, before the process starts), while `RuntimeCatalog` is the **post-runtime** external interface (produced during and after observation). `RuntimeDiagnostic` and `RuntimeTelemetry` are the **in-flight** observation surfaces. Together these four constitute a complete external interface surface: planning → observation → correlation → structured findings.

**Insertion point analysis:**

- **§10.13** is the current home for RuntimeCatalog/diagnostics/telemetry. It is integration-level and correctly scoped. However, it is embedded in §10 (Runtime realization), which is a fairly long section. The three observability artifacts belong here, but `PortableRuntimePlanArtifact` logically belongs closer to the SDK derivation section (§10.3–§10.5). Adding the full table here makes §10.13 the canonical integration-interface registry.
- **§15.7** is titled "Cache and control-plane boundaries" — it already has one foot in this territory via L2568. Adding a sub-section or replacing the L2568 sentence with a named-table reference would make §15.7 the cross-reference point, while the authoritative table stays at §10.13.
- **New §15.8** would be cleaner than embedding in §15.7 (which is about caches), and would sit adjacent to §15.6 (Policy), §15.5 (Telemetry), §15.4 (Diagnostics). Naming it "Platform external interfaces" makes it a dedicated registry section. This is the cleanest option structurally — §15 is "Runtime schema, config, diagnostics, telemetry, policy, and control-plane" and a §15.8 on platform external interfaces is a natural capstone.
- **§17.12** amendment is also warranted — the one-sentence invariant ("The diagnostic/control seam lives in runtime topology, catalog, diagnostics, telemetry, and explicitly owned control-plane touchpoints") should name the four artifacts.

**Conclusion on insertion point:** Add a new **§15.8 Platform external interfaces** section containing the table. Amend §17.12 to reference the four artifact names. Optionally cross-reference from §10.13 to §15.8. This separates concerns cleanly: §10.13 keeps the prose description of each construct; §15.8 formalizes the external consumer-class contract; §17.12 nails the invariant.

---

## Table draft

The following table is the proposed addition to arch-spec **§15.8 Platform external interfaces**:

| Interface name | Role / purpose | Producer | Consumer class | Owning runtime-spec section | Integration constraints |
|---|---|---|---|---|---|
| `PortableRuntimePlanArtifact` | Pre-runtime deployment / control-plane planning artifact. Allows inspection, control-plane handoff, and reproducible runtime planning | SDK derivation (`packages/core/sdk/src/derivation/`) | Runtime compiler; diagnostic tooling; topology export; deployment / control-plane tooling | Runtime spec §15.7 (L3409–L3437) | Portable: holds `ExecutionDescriptorRef` entries only — no live resources, no executable closures. Produced at derivation phase; consumed before or independently of process startup |
| `RuntimeCatalog` | Post-runtime diagnostic read model of full lifecycle topology. Records selected, derived, compiled, provisioned, bound, projected, executed, mounted, observed, and stopped topology | Runtime and diagnostics subsystem (`packages/core/runtime/topology/`) | Diagnostic readers; control-plane observation tooling | Runtime spec §22.3 (L4470–L4511) | Storage backend, indexing, and retention are reserved (runtime spec L4511). Minimum record sections are normative and stable. Does not retrieve live values; is not a second app composition file |
| `RuntimeDiagnostic` | Structured runtime finding, violation, status, or lifecycle event. Names the violated boundary or failed phase | All runtime layers (SDK, compiler, bootgraph, process runtime, adapters, harnesses) | Diagnostics pipeline; `RuntimeCatalog` aggregation; observability tooling | Runtime spec §22.1 (L4336–L4388) | Emitted across all seven lifecycle phases. Explains; does not compose. Finalization and rollback diagnostics do not create an additional lifecycle phase |
| `RuntimeTelemetry` | Runtime-owned span, event, annotation, and lifecycle telemetry chain for process and provisioning correlation | Runtime and harness integrations | Observability exporters (telemetry backend); diagnostic correlation | Runtime spec §22.2 (L4392–L4468) | Telemetry chain ordering is normative (entrypoint → derivation → compiler → bootgraph → provisioning → binding → adapter → harness → finalization). Telemetry backend is configurable (reserved). Service semantic observability is service-owned and does not flow through this interface |

---

## Insertion point recommendation

**Recommended location: new §15.8, inserted after §15.7 (Cache and control-plane boundaries), before the `---` separator that introduces §16.**

The section sequence in the arch-spec's §15 currently reads:
- §15.1 Runtime schema
- §15.2 Config and secrets
- §15.3 Import safety
- §15.4 Diagnostics
- §15.5 Telemetry
- §15.6 Policy primitives
- §15.7 Cache and control-plane boundaries

The new §15.8 would immediately follow §15.7 and would tie together the observability and control-plane artifacts named in §15.4, §15.5, and §15.7 into a single integration table.

### BEFORE (arch-spec L2568–L2570):

```
Runtime emits or consumes topology, health, profile, process identity, provider coverage, startup, finalization, diagnostics, telemetry, and catalog records at control-plane boundaries. Deployment and control-plane architecture own multi-process placement policy. Runtime realization emits the records that allow placement systems to reason; it does not decide placement.

---

## 16. Mechanical enforcement orientation
```

### AFTER (insert new §15.8 between §15.7's terminal sentence and the `---` separator):

```
Runtime emits or consumes topology, health, profile, process identity, provider coverage, startup, finalization, diagnostics, telemetry, and catalog records at control-plane boundaries. Deployment and control-plane architecture own multi-process placement policy. Runtime realization emits the records that allow placement systems to reason; it does not decide placement.

### 15.8 Platform external interfaces

The platform exposes four named artifacts as its formal integration surface for control-plane, deployment, and observation consumers. Each artifact is specified in the runtime realization specification. The arch-spec names them here as the canonical integration attachment points for companion deployment, observability, and control-plane specifications.

| Interface name | Role / purpose | Producer | Consumer class | Owning runtime-spec section | Integration constraints |
| --- | --- | --- | --- | --- | --- |
| `PortableRuntimePlanArtifact` | Pre-runtime planning artifact for deployment and control-plane inspection | SDK derivation | Runtime compiler; diagnostic tooling; topology export; deployment / control-plane tooling | Runtime spec §15.7 | Portable: `ExecutionDescriptorRef` entries only; no live resources or executable closures |
| `RuntimeCatalog` | Post-runtime diagnostic read model of full lifecycle topology | Runtime and diagnostics subsystem | Diagnostic readers; control-plane observation tooling | Runtime spec §22.3 | Storage backend reserved; minimum record sections are normative; not a live access surface |
| `RuntimeDiagnostic` | Structured finding, violation, status, or lifecycle event | All runtime layers | Diagnostics pipeline; catalog aggregation; observability tooling | Runtime spec §22.1 | All seven lifecycle phases; explains, does not compose |
| `RuntimeTelemetry` | Runtime span, event, annotation, and lifecycle telemetry chain | Runtime and harness integrations | Observability exporters; diagnostic correlation | Runtime spec §22.2 | Telemetry chain ordering is normative; backend is configurable; service semantic observability is service-owned |

Companion deployment and observability specifications attach at this table. The runtime realization specification owns the contracts; this table is the arch-spec's naming of the external integration surface.

---

## 16. Mechanical enforcement orientation
```

Additionally, **§10.13 should add a cross-reference** after its existing prose:

```
### 10.13 RuntimeCatalog, diagnostics, and telemetry

[existing prose — unchanged]

The formal external interfaces for these constructs, along with `PortableRuntimePlanArtifact`, are tabulated in §15.8 (Platform external interfaces).
```

---

## Optional invariant addition

The existing arch-spec §17.12 invariant (L2734–L2739) currently reads:

> "There is no generic shadow control-plane layer by default. The shell is not the control plane. The diagnostic/control seam lives in runtime topology, catalog, diagnostics, telemetry, and explicitly owned control-plane touchpoints."

**Proposed amendment:** Replace the third sentence with a named-artifact version:

> "The diagnostic/control seam lives in four named platform interfaces — `PortableRuntimePlanArtifact` (pre-runtime planning), `RuntimeCatalog` (post-runtime observation read model), `RuntimeDiagnostic` (structured findings), and `RuntimeTelemetry` (correlation chain) — each specified in the runtime realization specification and tabulated in §15.8."

This amendment converts an abstract phrase ("explicitly owned control-plane touchpoints") into a normative artifact enumeration, giving companion spec authors a definitive list.

---

## Cross-locus implications

**companion-spec-attachment-points-registry:** The platform-external-interfaces table (§15.8) is itself one row in the attachment-points registry. When the companion-spec-attachment-points-registry locus produces its attachment-points table, it should reference §15.8 as the attachment row for "deployment / observability companion specs." The naming is complementary: the registry says "deployment and observability companion specs attach at §15.8"; §15.8 says "here are the four artifacts those companion specs must work with."

**provisioning-kernel-inventory-depth-reduction:** `PortableRuntimePlanArtifact` is the one SDK derivation artifact that survives compression of the SDK derivation list (arch-spec L1655–L1665). When that locus recommends compressing the arch-spec's eight-artifact enumeration to a high-level statement, `PortableRuntimePlanArtifact` should be explicitly preserved in that compressed statement — because it is the only SDK derivation output that appears as an external interface in §15.8. A compressed arch-spec §10.3 might read: "The SDK derives portable and non-portable planning artifacts, including `PortableRuntimePlanArtifact` as the formal deployment/control-plane integration surface (§15.8). The complete artifact catalogue is defined in runtime spec §15."

---

## Committed position

The evidence from the runtime-spec is unambiguous: four named artifacts (`PortableRuntimePlanArtifact`, `RuntimeCatalog`, `RuntimeDiagnostic`, `RuntimeTelemetry`) are explicitly designated as external integration interfaces with specific consumer classes in §15.7, §22.1, §22.2, §22.3, and confirmed in the §27 component contract summary table. The arch-spec currently names three of these in prose (§10.13 for RuntimeCatalog, RuntimeDiagnostic, RuntimeTelemetry) but omits `PortableRuntimePlanArtifact` entirely from the architecture level, and presents even the three named constructs as prose description rather than as a formal integration table with consumer-class columns. The structural work required is precisely as narrow as the locus rationale suggests: surface the four artifacts in a single dedicated table at arch-spec §15.8, amend §17.12 to name them in the invariant, and add a cross-reference from §10.13. This is not a design decision — it is a documentation act: the runtime-spec has already done the design work by assigning consumer classes. The arch-spec must reflect that design at the architecture level to give deployment, observability, and control-plane companion spec authors a formal attachment point.

**Position:** Add a new arch-spec §15.8 "Platform external interfaces" containing a 4-row table (PortableRuntimePlanArtifact, RuntimeCatalog, RuntimeDiagnostic, RuntimeTelemetry) with columns for role/purpose, producer, consumer class, owning runtime-spec section, and integration constraints; amend §17.12 to name all four artifacts; add a cross-reference from §10.13.

**Confidence:** High. The artifacts are fully specified in the runtime-spec with explicit consumer classes; the gap in the arch-spec is unambiguous; the insertion point (§15.8 after the existing cache/control-plane content) is structurally clean and does not conflict with any other locus recommendation.

**Boundary conditions:** This position applies to the current state of both specs as read. It holds so long as the runtime-spec's §15.7, §22.1, §22.2, §22.3 designations of consumer classes remain stable. If the runtime-spec were revised to reclassify any of these four artifacts as runtime-internal (not externally consumed), the corresponding row should be removed from the arch-spec table.

**What would change this position:** If the user explicitly decides that the arch-spec should not enumerate named artifacts at all (operating at a purely conceptual level without type names), then the table is wrong and the §10.13 prose approach would be the right model for all four artifacts. No evidence in either spec or the analysis documents suggests this is the user's intent — the user's request is for "explicit" integration points "with interfaces, boundaries, conditions, rules."

**Evidence weight:** 4 runtime-spec sections (§15.7, §22.1, §22.2, §22.3) + 1 runtime-spec component summary table (§27) establish the artifact designations. 2 arch-spec sections (§10.13, §15.7 L2568) establish the gap. 1 contradiction-graph cluster (`portable-plan-artifact-as-control-plane-interface-missing`) confirms the gap assessment. 2 source-analysis sections (§4.6, §4.7 of source-analysis-runtime-spec.md) classify these artifacts as integration contracts. All sources agree; zero contradictions.

---

## Open questions

- **RuntimeDiagnosticContributor:** The runtime-spec §27 (L5129) names `RuntimeDiagnosticContributor` as consumed by "Runtime catalog. Phase: Provisioning/observation." Should it appear as a fifth row in the table? It is less clearly an "external" interface (it is produced by resources/providers, not by a single system-level component) and its consumer (RuntimeCatalog) is already in the table. Recommend omitting from the initial table and noting it as a resource-level diagnostic contribution mechanism in §10.13's prose. The orchestrator should flag this for user review if the table is to be expanded.
- **ExecutionRegistry exposure for diagnostics:** The §27 summary row for `ExecutionRegistry` names it as consumed by "Adapters and process execution runtime" — this is runtime-internal, not external. The arch-spec need not name it in the external-interfaces table. Confirmed omission.
- **Protocol / format specificity:** The arch-spec currently does not name an observability protocol (e.g., OTLP). The source-analysis-arch-spec §6.6 flags this as a gap. The platform-external-interfaces table does not resolve this (it names the artifact, not the wire format). A follow-up recommendation in terminal section 4 should note that §15.8 or a companion observability spec must eventually specify whether OTLP is the default telemetry export format.

---

## Sources

1. [[rawr-effect-runtime-realization-system-canonical-spec-source]] — RAWR Effect Runtime Realization System Canonical Spec (source) — §15.7 (L3409–L3437), §22.1 (L4336–L4388), §22.2 (L4392–L4468), §22.3 (L4470–L4511), §27 (L5087–L5130)
2. [[rawr-canonical-architecture-spec-source]] — RAWR Canonical Architecture Spec (source) — §10.13 (L1813–L1824), §15.7 (L2554–L2568), §17.12 (L2734–L2739)
3. [[source-analysis-runtime-spec]] — Source Analysis (runtime spec) — §4.6, §4.7, §6.6, §6.7
4. [[source-analysis-arch-spec]] — Source Analysis (arch spec) — §4f, §4g, §6.6
5. [[contradiction-graph.json]] (research/temp) — cluster `portable-plan-artifact-as-control-plane-interface-missing`
