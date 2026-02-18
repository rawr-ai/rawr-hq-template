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

---

## Follow-Up Alignment Pass (Context Placement + Snippet Alias)

### Scope of follow-up
Doc ergonomics only (no architecture change):
1. Codify explicit context-contract placement default (`context.ts` or equivalent dedicated context module).
2. Codify short schema helper alias convention in snippets (`typeBoxStandardSchema as std`).
3. Apply alias consistently in procedure input/output snippets where practical.

### Per-file follow-up changes

#### 1) `docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
- Added subsystem invariant that shared context contracts default to dedicated `context.ts` modules and are consumed by routers.
- Added subsystem invariant that canonical snippet alias is `typeBoxStandardSchema as std`; `_`/`_$` remains feasible but non-canonical for readability.
- Updated integrative topology to include `context.ts` in package/api/workflow module layouts.
- Extended naming/governance section with explicit `context.ts` default and alias convention language.

#### 2) `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`
- Added packet-level cross-cutting default for explicit context contract placement in `context.ts` modules.
- Added packet-level cross-cutting default for canonical `std` alias usage in snippets.
- Added packet-wide rule to avoid convenience overloading of context contracts inside router snippets.

#### 3) `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md`
- Added canonical policy requirements for:
  - dedicated `context.ts` context contracts consumed by router/client
  - `std` alias convention in snippets
- Updated default package tree and layer roles to include `context.ts`.
- Reworked canonical snippets:
  - procedure snippet now imports `typeBoxStandardSchema as std` and uses `std(...)` for `.input(...)`/`.output(...)`
  - context contract moved to dedicated `context.ts` snippet
  - router/client/index snippets now consume/re-export context from `context.ts` instead of declaring it in router
- Expanded naming defaults with explicit `context.ts` + alias guidance.

#### 4) `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_07_HOST_HOOKING_COMPOSITION.md`
- Expanded naming rules to codify dedicated `context.ts` modules for shared context contracts.
- Added canonical snippet alias rule (`typeBoxStandardSchema as std`; `_`/`_$` non-canonical).
- Updated canonical file tree to include `context.ts` in package/api/workflow shapes.

#### 5) `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`
- Added canonical policy for shared workflow trigger context contracts in dedicated `context.ts`.
- Expanded workflow naming defaults with context placement + alias guidance.
- Updated trigger contract snippet to import `typeBoxStandardSchema as std` and use `std(...)` for `.input(...)`/`.output(...)`.
- Split trigger router illustration into explicit `context.ts` + `router.ts` snippets so router consumes context instead of declaring it inline.

### Follow-up rationale
1. Makes context ownership explicit and reusable across procedures/router/client without changing runtime behavior.
2. Improves snippet readability and consistency by standardizing on a short-but-clear alias (`std`) instead of terse symbolic aliases.
3. Keeps the prior naming/schema policy intact while tightening docs ergonomics and reducing ambiguity for implementers.

### Follow-up non-changes
1. No changes to API/workflow/inngest split posture.
2. No changes to route/mount semantics.
3. No runtime code edits.
4. No edits outside owned files.
