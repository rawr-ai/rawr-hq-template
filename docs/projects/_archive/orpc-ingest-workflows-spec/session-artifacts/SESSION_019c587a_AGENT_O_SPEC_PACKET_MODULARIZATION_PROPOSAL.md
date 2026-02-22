# SESSION_019c587a — Agent O Spec Packet Modularization Proposal

## 1) Decision Summary

This proposal modularizes the flat runtime packet into concern-owned canonical docs so extraction can happen without policy drift.

Locked posture retained:
1. Keep split runtime semantics (oRPC boundary harness vs Inngest durability harness).
2. Keep one external contract generation path from composed oRPC/OpenAPI surface.
3. Keep manifest-first composition authority (`rawr.hq.ts`) and explicit host mounts.
4. Keep runtime metadata minimal (`rawr.kind`, `rawr.capability`) and strict import boundaries.
5. Keep deferred decisions deferred (`D-004`, `D-005`) until closure criteria are met.

## 2) Proposed Packet Topology (Files, Responsibility, Cross-Links, Scope Boundaries)

| Proposed file | Primary responsibility (single source of truth) | Cross-links | In scope | Out of scope |
| --- | --- | --- | --- | --- |
| `docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md` (retain, thin) | Packet entrypoint, intent, decision index, navigation | `DECISIONS.md`, `SPEC_01_*` through `SPEC_08_*` | Problem statement, design goals, packet map, “no hidden decisions” rule | Deep harness policy, long code examples, migration details |
| `docs/system/spec-packet/DECISIONS.md` (retain) | Architecture decision register and closure state | All `SPEC_*` docs cite decision IDs | Closed/deferred decisions, owner, closure criteria | Implementation recipes, prose duplication of policy |
| `docs/system/spec-packet/SPEC_01_RUNTIME_BOUNDARIES.md` | Normative split policy across API/workflow/durable ingress | `SPEC_03_*`, `SPEC_04_*`, `SPEC_05_*` | MUST/MUST NOT rules, anti-dual-path rule, naming rules | Package service internals, long per-capability examples |
| `docs/system/spec-packet/SPEC_02_PACKAGE_PLUGIN_MODEL.md` | Package/plugin topology and ownership boundaries | `SPEC_03_*`, `SPEC_04_*`, `SPEC_08_*` | Internal package default shape, API plugin default shape, workflow plugin default shape, scale rule | Host mount wiring internals, migration scheduling |
| `docs/system/spec-packet/SPEC_03_ORPC_BOUNDARY_MODEL.md` | oRPC contract/router/client policy for caller-facing APIs | `SPEC_01_*`, `SPEC_02_*`, `SPEC_06_*`, `SPEC_08_*` | Contract-first boundary policy, external SDK generation path, internal calling defaults, context-at-ingress rules | Inngest function durability semantics |
| `docs/system/spec-packet/SPEC_04_INNGEST_DURABILITY_MODEL.md` | Inngest durability posture and trigger-to-run boundary | `SPEC_01_*`, `SPEC_02_*`, `SPEC_06_*`, `SPEC_08_*` | Function ownership, retries/steps/idempotency posture, `/api/inngest` ingress-only rule, durable endpoint additive-only rule | Boundary OpenAPI contract policy |
| `docs/system/spec-packet/SPEC_05_MANIFEST_AND_HOST_COMPOSITION.md` | Composition authority and host mount contract | `SPEC_01_*`, `SPEC_02_*`, `SPEC_03_*`, `SPEC_04_*` | `RawrHqManifest` contract, metadata contract, import-boundary contract, mount ordering and ownership | Detailed per-procedure examples |
| `docs/system/spec-packet/SPEC_06_CROSS_CUTTING_PLACEMENT.md` | Cross-cutting concern placement matrix (no duplication) | `SPEC_03_*`, `SPEC_04_*`, `SPEC_05_*`, `DECISIONS.md` | Auth, validation, context, errors, observability, correlation, policy placement rules | New capability-specific behavior or migration playbooks |
| `docs/system/spec-packet/SPEC_07_MIGRATION_AND_VALIDATION.md` | Phased extraction/cutover plan and acceptance gates | `DECISIONS.md`, `SPEC_05_*`, `SPEC_08_*` | Phase sequencing, risk model, test gates, CI checks, de-legacy gates | Normative harness definitions already owned elsewhere |
| `docs/system/spec-packet/SPEC_08_E2E_REFERENCE_FLOWS.md` | Non-normative, code-first reference flows tied back to policy docs | `SPEC_02_*`, `SPEC_03_*`, `SPEC_04_*`, `SPEC_05_*` | Example A/B/C flows, reference trees, implementation sketches | Defining policy; examples cannot introduce new rules |

## 3) Bubble-Up Overview Structure (ORPC + Inngest + Package/Plugin Dynamic)

Use this structure in the packet entrypoint and link each layer to one owner doc.

### Layer 0: Capability package core (transport-neutral)
- Owns: domain entities, service logic, internal procedures, internal client.
- Canonical doc: `SPEC_02_PACKAGE_PLUGIN_MODEL.md`.

### Layer 1A: API plugin boundary (caller-facing oRPC)
- Owns: boundary contract + boundary router, optional boundary operations.
- Canonical docs: `SPEC_02_PACKAGE_PLUGIN_MODEL.md`, `SPEC_03_ORPC_BOUNDARY_MODEL.md`.

### Layer 1B: Workflow plugin boundary + durability
- Owns trigger contract/router (caller-facing trigger) and durable functions (runtime execution).
- Canonical docs: `SPEC_02_PACKAGE_PLUGIN_MODEL.md`, `SPEC_04_INNGEST_DURABILITY_MODEL.md`.

### Layer 2: Composition authority
- Owns capability aggregation into one manifest and one composed oRPC tree + Inngest bundle.
- Canonical doc: `SPEC_05_MANIFEST_AND_HOST_COMPOSITION.md`.

### Layer 3: Host runtime mounting
- Owns explicit mount points and context injection order.
- Canonical docs: `SPEC_05_MANIFEST_AND_HOST_COMPOSITION.md`, `SPEC_03_ORPC_BOUNDARY_MODEL.md`, `SPEC_04_INNGEST_DURABILITY_MODEL.md`.

### Flow map
1. External non-durable request:
   - Caller -> oRPC boundary route -> internal package client/service -> response.
2. External durable trigger request:
   - Caller -> workflow trigger route (oRPC) -> `inngest.send` -> Inngest function (`step.run`) -> run/timeline status.
3. Internal in-process call:
   - Server/module -> package internal client (no local HTTP self-call).

## 4) Rules for Cross-Cutting Concern Placement (No Duplication)

### Rule Set

1. A concern gets exactly one normative home doc; all other docs link back.
2. API boundary concerns stay in oRPC/Elysia policy docs; durability concerns stay in Inngest policy docs.
3. Request context and durable context are documented separately and never merged into one pseudo-universal context model.
4. Error semantics are split by surface:
   - API: typed oRPC error contract.
   - Durability: run/timeline lifecycle states.
5. OpenAPI/client generation policy is defined once in ORPC boundary doc and referenced elsewhere.
6. Metadata/runtime boundary policy is defined once in manifest/host composition doc.
7. Examples doc is non-normative and cannot redefine policy.
8. New architectural ambiguity is blocked until logged in `DECISIONS.md`.

### Placement Matrix

| Concern | Canonical placement | Secondary references only |
| --- | --- | --- |
| Schema artifacts (TypeBox + standard adapter usage) | `SPEC_03_ORPC_BOUNDARY_MODEL.md` + `SPEC_02_PACKAGE_PLUGIN_MODEL.md` | `SPEC_08_E2E_REFERENCE_FLOWS.md` |
| API auth/validation/visibility/rate policy | `SPEC_03_ORPC_BOUNDARY_MODEL.md` | `SPEC_06_CROSS_CUTTING_PLACEMENT.md` |
| Durable retries/idempotency/step boundaries | `SPEC_04_INNGEST_DURABILITY_MODEL.md` | `SPEC_06_CROSS_CUTTING_PLACEMENT.md` |
| Request context construction | `SPEC_03_ORPC_BOUNDARY_MODEL.md` | `SPEC_05_MANIFEST_AND_HOST_COMPOSITION.md` |
| Durable run context construction | `SPEC_04_INNGEST_DURABILITY_MODEL.md` | `SPEC_05_MANIFEST_AND_HOST_COMPOSITION.md` |
| Trace/correlation and observability split | `SPEC_06_CROSS_CUTTING_PLACEMENT.md` | `SPEC_03_*`, `SPEC_04_*` |
| Manifest contract + metadata + import boundaries | `SPEC_05_MANIFEST_AND_HOST_COMPOSITION.md` | `SPEC_07_MIGRATION_AND_VALIDATION.md` |
| Decision closure lifecycle | `DECISIONS.md` | `FLAT_RUNTIME_SPEC_PACKET.md` |

## 5) Navigation Map (If You Need X, Read Y)

| If you need... | Read this first | Then read |
| --- | --- | --- |
| Why API and workflow surfaces stay split | `SPEC_01_RUNTIME_BOUNDARIES.md` | `SPEC_03_ORPC_BOUNDARY_MODEL.md`, `SPEC_04_INNGEST_DURABILITY_MODEL.md` |
| How to model a new capability package and plugin surfaces | `SPEC_02_PACKAGE_PLUGIN_MODEL.md` | `SPEC_08_E2E_REFERENCE_FLOWS.md` |
| How boundary contracts/routers and client generation should work | `SPEC_03_ORPC_BOUNDARY_MODEL.md` | `SPEC_05_MANIFEST_AND_HOST_COMPOSITION.md` |
| How workflow trigger APIs connect to Inngest durable functions | `SPEC_04_INNGEST_DURABILITY_MODEL.md` | `SPEC_08_E2E_REFERENCE_FLOWS.md` |
| Where metadata/import-boundary policy lives | `SPEC_05_MANIFEST_AND_HOST_COMPOSITION.md` | `SPEC_07_MIGRATION_AND_VALIDATION.md` |
| Where to place auth/errors/observability/correlation rules | `SPEC_06_CROSS_CUTTING_PLACEMENT.md` | `SPEC_03_ORPC_BOUNDARY_MODEL.md`, `SPEC_04_INNGEST_DURABILITY_MODEL.md` |
| How to sequence migration and gates | `SPEC_07_MIGRATION_AND_VALIDATION.md` | `DECISIONS.md` |
| Which examples match policy-compliant shapes | `SPEC_08_E2E_REFERENCE_FLOWS.md` | Back-links in each example header |
| Whether a new ambiguity needs formal closure | `DECISIONS.md` | `FLAT_RUNTIME_SPEC_PACKET.md` |

## 6) Source-to-Target Extraction Plan (Implementation-Ready)

### Phase 1: Scaffold and freeze ownership
1. Keep `FLAT_RUNTIME_SPEC_PACKET.md` and `DECISIONS.md` as anchors.
2. Add `SPEC_01` through `SPEC_08` files with section stubs and cross-links.
3. Declare “single-owner per concern” headers at top of each new spec doc.

### Phase 2: Extract normative policy
1. Move hard rules, anti-dual-path policy, naming rules into `SPEC_01_RUNTIME_BOUNDARIES.md`.
2. Move ORPC-specific policy into `SPEC_03_ORPC_BOUNDARY_MODEL.md`.
3. Move Inngest-specific durability policy into `SPEC_04_INNGEST_DURABILITY_MODEL.md`.
4. Move manifest/metadata/import boundary rules into `SPEC_05_MANIFEST_AND_HOST_COMPOSITION.md`.

### Phase 3: Extract topology and references
1. Move internal package + plugin topology defaults and scale rule into `SPEC_02_PACKAGE_PLUGIN_MODEL.md`.
2. Move examples into `SPEC_08_E2E_REFERENCE_FLOWS.md` and add explicit “non-normative” label.
3. Consolidate cross-cutting concern matrix into `SPEC_06_CROSS_CUTTING_PLACEMENT.md`.

### Phase 4: Migration and validation closure
1. Move phased migration strategy and risk model into `SPEC_07_MIGRATION_AND_VALIDATION.md`.
2. Align acceptance criteria + CI/test gates with `DECISIONS.md` closure criteria.
3. Trim `FLAT_RUNTIME_SPEC_PACKET.md` to packet overview + routing index only.

### Phase 5: De-duplication pass
1. Remove repeated policy text from example docs and route to canonical owners.
2. Ensure every rule appears once as canonical text.
3. Validate all cross-links resolve and no doc introduces conflicting policy language.

## 7) Done Criteria for Packet Extraction Phase

1. Every proposed spec doc exists with explicit in-scope/out-of-scope boundary.
2. `FLAT_RUNTIME_SPEC_PACKET.md` is an index/overview, not a monolithic policy dump.
3. `DECISIONS.md` remains the only decision closure source.
4. Hard runtime boundaries and cross-cutting placements are no longer duplicated.
5. E2E examples are explicitly non-normative and fully linked back to canonical policy docs.
