# Deferrals

## Deferred Items

### 2026-05-04 — Runtime-Architecture Alignment closure deferrals

Surfaced by the runtime-architecture-alignment workstream
(`workstreams/runtime-architecture-alignment/`) at Phase 5 closure. Each
item carries owner/authority-home/trigger/evidence-link.

#### D-1: Regenerate M2 migration plan against aligned arch-spec

- **Owner:** future DRA opening the M2 migration regeneration workstream
- **Authority home:** `.context/M2-migration-planning-packet/` + the now-aligned canonical specs at `resources/spec/`
- **Trigger:** alignment release PR merges to main; M2 migration phase resumes
- **Evidence link:** `.context/M2-migration-planning-packet/01-primary-authorities.md` (authority order); `workstreams/runtime-architecture-alignment/record.md` (alignment outcome)

#### D-2: Author deployment companion specification

- **Owner:** future DRA opening the deployment-companion-spec workstream
- **Authority home:** new `resources/spec/RAWR_Deployment_Realization_Canonical_Spec.md` (or equivalent) attaching at arch-spec §10.14 row "Control-plane and deployment interface"
- **Trigger:** first concrete deployment-platform target selection (Vercel? Cloudflare? AWS? bare metal?)
- **Evidence link:** arch-spec §10.14 + §15.8 (`PortableRuntimePlanArtifact` named integration interface)

#### D-3: Author observability companion specification

- **Owner:** future DRA opening the observability-companion-spec workstream
- **Authority home:** new `resources/spec/RAWR_Observability_Canonical_Spec.md` (or equivalent) attaching at arch-spec §10.14 rows "Runtime access" + "Diagnostics, telemetry, and observation"
- **Trigger:** first telemetry-backend choice (OTLP? proprietary?)
- **Evidence link:** arch-spec §15.8 rows for `RuntimeCatalog`, `RuntimeDiagnostic`, `RuntimeTelemetry`

#### D-4: Author profile companion specification

- **Owner:** future DRA opening the profile-companion-spec workstream
- **Authority home:** new profile companion spec attaching at arch-spec §10.14 row "Lifecycle vocabulary" (specifically `definition` and `selection` phases) and arch-spec §10.2 (App definition + entrypoint)
- **Trigger:** profile catalog formalization need (more than ad-hoc per-app profiles)
- **Evidence link:** arch-spec §10.2 lifecycle table; runtime-spec §13 (resource/provider/profile model)

#### D-5: Identify or build third-party OpenShell vendor; audit §13.5 contract

- **Owner:** future DRA opening the OpenShell-vendor-selection workstream
- **Authority home:** arch-spec §13.5 (third-party vendor contract); runtime-spec §21.5
- **Trigger:** first OpenShell implementation slice (when an actual agent-substrate implementation is selected or built)
- **Evidence link:** arch-spec §13.5 third-party vendor contract paragraph; `workstreams/runtime-architecture-alignment/decisions.md` Decision #2 = Option B
- **Note:** The vendor-contract *shape* is locked at this alignment release. The vendor *identity* (which third-party implementation satisfies the contract) is the deferred item.
