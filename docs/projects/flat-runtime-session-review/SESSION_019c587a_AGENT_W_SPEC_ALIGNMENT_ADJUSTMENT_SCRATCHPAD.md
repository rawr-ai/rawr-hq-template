# SESSION_019c587a — Agent W Spec Alignment Adjustment Scratchpad

## Scope
Doc-only spec alignment for naming/schema policy across owned ORPC + Inngest posture docs.

Requested policy targets:
1. Domain file naming convention: no redundant domain-prefix filenames inside the same `domain/` folder.
2. TypeBox-first domain schema policy with static type exports from the same file.
3. Naming brevity convention for domain/plugin directory names (prefer concise names like `invoicing` when clear).

## Exact Spec-Level Changes

### 1) `docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
- Updated **Global Invariants** to codify:
  - TypeBox-first domain schema modules with co-located static type exports.
  - Non-redundant domain filenames within `domain/`.
  - Concise domain/plugin naming defaults (`invoicing`-style tokens).
- Updated integrative topology placeholders:
  - `packages/<capability>` -> `packages/<domain>`
  - `plugins/api/<capability>-api` -> `plugins/api/<domain>-api`
  - `plugins/workflows/<capability>-workflows` -> `plugins/workflows/<domain>-workflows`
- Expanded **Naming, Adoption, and Scale Governance** with explicit filename/schema/directory naming rules.

### 2) `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`
- Expanded **Cross-Cutting Defaults** with packet-wide policy defaults for:
  - TypeBox-first domain schema + static exports.
  - No redundant domain-prefix filenames in `domain/`.
  - Concise domain/plugin directory naming.
- Added naming posture clarification under **Canonical Ownership Split**.
- Added packet rule that examples should follow walkthrough-aligned concise naming defaults when clear.

### 3) `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md`
- Expanded **Canonical Policy** to include:
  - TypeBox-first domain schema requirement with static exports from same file.
  - Non-redundant filename rule for domain files.
  - Concise naming guidance for package/plugin directories.
- Updated internal package default tree to `packages/<domain>/src`.
- Updated layer-role description for `domain/*` to include schema+type co-location.
- Updated domain examples to reflect policy directly:
  - `domain/invoice-status.ts` -> `domain/status.ts` (TypeBox schema + `Static` export)
  - `domain/invoice.ts` -> `domain/run.ts` (TypeBox schema + `Static` export)
- Updated corresponding snippet paths/examples from `invoice-processing` to concise `invoicing` where policy examples are shown.
- Expanded **Naming Defaults (Applicable)** with explicit rules and examples.

### 4) `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_07_HOST_HOOKING_COMPOSITION.md`
- Expanded **Naming Rules (Canonical)** with explicit policy for:
  - Concise directory names.
  - Non-redundant `domain/*` filenames.
  - TypeBox-first domain schema + co-located static exports.
- Updated canonical file tree placeholders from `<capability>` to `<domain>` forms for package/API/workflow directories.

### 5) `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`
- Added workflow-surface policy that trigger contracts should consume TypeBox-first domain schemas with co-located static exports.
- Updated canonical workflow plugin shape from `<capability>-workflows` to `<domain>-workflows`.
- Added **Naming Defaults (Workflow Surface)** section covering concise naming and non-redundant domain filename posture.

## Rationale
1. Keeps architecture posture unchanged while making naming/schema policy explicit and enforceable at spec level.
2. Reduces filename redundancy and path verbosity in domain-scoped folders without altering boundary semantics.
3. Aligns policy language with walkthrough naming direction (`invoicing` where clear) while avoiding broad churn outside owned docs.
4. Makes TypeBox-first intent concrete at the domain module level, not only at contract/procedure boundaries.

## Non-Changes (Intentional)
1. No changes to split posture (API boundary vs workflow trigger vs Inngest durability).
2. No changes to mount boundaries (`/api/orpc`, `/rpc`, `/api/inngest`).
3. No runtime source edits.
4. No edits outside owned files.
