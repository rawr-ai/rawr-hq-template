# Lane 1.4 Patch — Recommendation #4: Platform External Interfaces

**Workstream:** Runtime-Architecture Alignment  
**Lane:** 1.4  
**Target spec:** `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`  
**Decisions in effect:** Decision #5 = Option B (omit `RuntimeDiagnosticContributor` row; §15.8 is exactly 4 rows). W-4 (`PortableRuntimePlanArtifact`): name in §15.8 as first row.

---

## Sub-edit 1.4.A — Insert §15.8 between §15.7 and §16

**Location:** Lines 2568–2572 of spec (§15.7 closing paragraph through `## 16` heading).

### BEFORE

```
Runtime emits or consumes topology, health, profile, process identity, provider coverage, startup, finalization, diagnostics, telemetry, and catalog records at control-plane boundaries. Deployment and control-plane architecture own multi-process placement policy. Runtime realization emits the records that allow placement systems to reason; it does not decide placement.

---

## 16. Mechanical enforcement orientation
```

### AFTER

```
Runtime emits or consumes topology, health, profile, process identity, provider coverage, startup, finalization, diagnostics, telemetry, and catalog records at control-plane boundaries. Deployment and control-plane architecture own multi-process placement policy. Runtime realization emits the records that allow placement systems to reason; it does not decide placement.

### 15.8 Platform external interfaces

The platform exposes a small, normative set of external interfaces — pre-runtime planning, post-runtime observation, structured findings, correlation telemetry — that companion subsystem specifications and external tooling consume. They are the shared external surface area future deployment, observability, and control-plane companion specifications attach to.

| Interface name | Role / purpose | Producer | Consumer class | Owning runtime-spec section | Integration constraints |
|---|---|---|---|---|---|
| `PortableRuntimePlanArtifact` | Pre-runtime planning artifact for deployment and control-plane inspection | SDK derivation | Runtime compiler, diagnostic tooling, topology export, and deployment/control-plane touchpoints | Runtime spec §15.7 | Portable: holds `ExecutionDescriptorRef` entries only — no live resources, no executable closures. Produced at derivation phase; consumed before or independently of process startup. |
| `RuntimeCatalog` | Post-runtime diagnostic read model of full lifecycle topology (selected, derived, compiled, provisioned, bound, projected, executed, mounted, observed, stopped) | Runtime and diagnostics subsystem | Diagnostic readers; control-plane observation tooling | Runtime spec §22.3 | Storage backend, indexing, and retention are reserved-detail boundaries (locked when an observability companion spec triggers). Minimum record sections are normative; not a live access surface; not a source of truth. |
| `RuntimeDiagnostic` | Structured runtime finding, violation, status, or lifecycle event; names the violated boundary or failed phase | All runtime layers (SDK, compiler, bootgraph, process runtime, adapters, harnesses) | Diagnostics pipeline; `RuntimeCatalog` aggregation; observability tooling | Runtime spec §22.1 | Emitted across all seven lifecycle phases. Diagnostics name the violated boundary or failed lifecycle phase; they explain — they do not compose. |
| `RuntimeTelemetry` | Runtime-owned span, event, annotation, and lifecycle telemetry chain for process and provisioning correlation | Runtime and harness integrations | Observability exporters (telemetry backend); diagnostic correlation | Runtime spec §22.2 | Telemetry chain ordering is normative (entrypoint → derivation → compiler → bootgraph → provisioning → binding → adapter → harness → finalization). Telemetry backend is a reserved-detail boundary. Service semantic observability is service-owned and does not flow through this interface. |

This table is a deliberate subset of the full runtime component contract summary in runtime spec §27, filtered to the externally consumed integration interfaces only. Companion specifications that need internal component shapes refer to the runtime-spec catalogue; companion specifications that attach to the platform's external surface refer to this section.

`RuntimeDiagnosticContributor` is intentionally omitted from this table: it is resource-authored (services emit diagnostic contributions), not system-authored (the runtime emits `RuntimeDiagnostic` records).

---

## 16. Mechanical enforcement orientation
```

---

## Sub-edit 1.4.B — Amend §17.12 third sentence

**Location:** Lines 2734–2738 of spec (§17.12 heading + two paragraphs).

### BEFORE

```
### 17.12 Control-plane invariant

There is no generic shadow control-plane layer by default.

The shell is not the control plane. The diagnostic/control seam lives in runtime topology, catalog, diagnostics, telemetry, and explicitly owned control-plane touchpoints.
```

### AFTER

```
### 17.12 Control-plane invariant

There is no generic shadow control-plane layer by default.

The shell is not the control plane. The diagnostic/control seam lives in four named platform interfaces — `PortableRuntimePlanArtifact` (pre-runtime planning), `RuntimeCatalog` (post-runtime observation read model), `RuntimeDiagnostic` (structured findings), and `RuntimeTelemetry` (correlation chain) — each specified in the runtime realization specification and tabulated in §15.8.
```

---

## Sub-edit 1.4.C — Add §10.13 cross-reference

**Location:** Line 1824 of spec (§10.13 closing sentence, inside §10.13 body, above where Lane 1.2 inserts §10.14).

### BEFORE

```
Service semantic observability remains service-owned and oRPC-native inside the service boundary.
```

### AFTER

```
Service semantic observability remains service-owned and oRPC-native inside the service boundary. The named platform-external observability interfaces (`PortableRuntimePlanArtifact`, `RuntimeCatalog`, `RuntimeDiagnostic`, `RuntimeTelemetry`) are tabulated at §15.8.
```
