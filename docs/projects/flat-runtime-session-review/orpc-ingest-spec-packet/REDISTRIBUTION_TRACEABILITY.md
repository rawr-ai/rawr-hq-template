# Redistribution Traceability

## Purpose
This artifact proves where content from the prior monolithic posture spec was redistributed.

Source monolith (pre-breakout):
- `../SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`

Current integrative overview:
- `../SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`

Current leaf packet:
- `./ORPC_INGEST_SPEC_PACKET.md`
- `./AXIS_01_EXTERNAL_CLIENT_GENERATION.md` through `./AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md`

## Section-Level Mapping

| Old monolith section | New location(s) |
| --- | --- |
| `## 1) Scope + Locked Decision` | Overview: `../SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` sections `1) Scope`, `2) Locked Decisions`, `3) Original Tensions` |
| `## 2) Axes Catalog` | Overview: `../SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` section `5) Axis Map (Coverage)` and packet index in `./ORPC_INGEST_SPEC_PACKET.md` |
| `### Axis 1: External Client Generation` | `./AXIS_01_EXTERNAL_CLIENT_GENERATION.md` |
| `### Axis 2: Internal Clients/Internal Calling` | `./AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md` |
| `### Axis 3: Split vs Collapse` | `./AXIS_03_SPLIT_VS_COLLAPSE.md` |
| `### Axis 4: Context Creation/Propagation` | `./AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md` |
| `### Axis 5: Errors/Logging/Observability` | `./AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md` |
| `### Axis 6: Middleware/Cross-Cutting Concerns` | `./AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md` |
| `### Axis 7: Host Hooking/Composition` | `./AXIS_07_HOST_HOOKING_COMPOSITION.md` |
| `### Axis 8: Workflows vs APIs Boundaries` | `./AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md` |
| `### Axis 9: Durable Endpoints vs Durable Functions` | `./AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md` |
| `## 4) Rules and Boundaries (Normative)` | Global invariants and governance moved to overview section `4) Global Invariants` and overview section `9) Naming, Adoption, and Scale Governance`; detailed application split across `AXIS_01`, `AXIS_02`, `AXIS_03`, `AXIS_08`, `AXIS_09` |
| `### Hard Rules (MUST / MUST NOT / SHOULD)` | Overview section `4) Global Invariants` + axis-owned enforcement details in `AXIS_01`..`AXIS_09` |
| `### Explicit Anti-Dual-Path Policy` | `./AXIS_03_SPLIT_VS_COLLAPSE.md` |
| `### Naming Rules (Canonical)` | Overview section `9) Naming, Adoption, and Scale Governance`; concrete usage in `AXIS_02`, `AXIS_07` |
| `### Adoption Exception (Explicit)` | `./AXIS_03_SPLIT_VS_COLLAPSE.md` |
| `### Scale Rule (Default Progression)` | `./AXIS_03_SPLIT_VS_COLLAPSE.md` |
| `## 5) Implementation Inventory / Glue Code` | Core inventory and fixtures moved to `./AXIS_07_HOST_HOOKING_COMPOSITION.md`; internal package default moved to `./AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md`; boundary API plugin default moved to `./AXIS_01_EXTERNAL_CLIENT_GENERATION.md`; workflow trigger split moved to `./AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`; durable adapter constraints moved to `./AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md` |
| `### Canonical Harness Files (A-D)` | `./AXIS_07_HOST_HOOKING_COMPOSITION.md` (and axis-specific excerpts in `AXIS_01`, `AXIS_04`, `AXIS_05`) |
| `### Canonical File Tree` | Overview section `6) Integrative Topology` + detailed host tree in `./AXIS_07_HOST_HOOKING_COMPOSITION.md` |
| `### Glue Boundaries and Ownership` | `./AXIS_07_HOST_HOOKING_COMPOSITION.md` |
| `### Optional Composition Helpers` | `./AXIS_07_HOST_HOOKING_COMPOSITION.md` |
| `## 6) End-to-End Examples` | Overview section `7) Integrative Interaction Flows`; axis-owned deeper snippets in `AXIS_02`, `AXIS_08`, `AXIS_07` |
| `## 7) Source Anchors` | Overview section `10) Source Anchors`; axis-specific references retained in each leaf |

## Completeness Notes
1. All nine axis policies now have explicit dedicated leaf specs.
2. Non-axis normative material (hard rules, anti-dual, naming, adoption, scale) is retained in overview plus axis-owned enforcement docs.
3. Implementation inventory, fixtures, and helper guidance are preserved under host/composition ownership.
4. End-to-end interactions are preserved in overview and reinforced in axis-specific snippets.
