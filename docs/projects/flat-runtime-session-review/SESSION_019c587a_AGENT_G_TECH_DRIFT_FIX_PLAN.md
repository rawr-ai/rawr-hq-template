# SESSION_019c587a — Agent G Tech Drift Fix Plan

## Mission

Apply a focused technology-drift correction pass to:

- `docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md`

without changing architecture intent, only correcting stack accuracy and missing plumbing clarity.

## Touch-Up Plan (Current Pass)

1. Re-verify Standard Schema support reality from `typebox` skill + official upstream sources (TypeBox/TypeMap/Standard Schema references).
2. Record a precise conclusion with source links in scratchpad before canonical edits.
3. Update canonical doc to a single centralized adapter placement pattern (no repeated helper-definition pattern in per-contract examples).
4. Switch contract snippet style to inline `input`/`output` schemas by default, keeping standalone schema constants only when clearly reusable domain schemas.
5. Keep architecture intent unchanged; limit edits strictly to touch-up scope.

## Touch-Up Findings Snapshot

- TypeBox core appears JSON-Schema-first and does not expose Standard Schema V1 directly on schema values by default.
- TypeBox repo includes a Standard Schema adapter example (`example/standard`) rather than core direct support docs.
- TypeMap provides `~standard` validator surfaces and can bridge to Standard Schema interfaces when needed.
- For this canonical doc, centralized adapter import pattern (`@rawr/orpc-standards`) + inline per-procedure schema definitions is the clearest stack-aligned default.

## Touch-Up References (Primary)

- TypeBox README: `https://raw.githubusercontent.com/sinclairzx81/typebox/main/readme.md`
- TypeBox Standard Schema example adapter: `https://raw.githubusercontent.com/sinclairzx81/typebox/main/example/standard/readme.md`
- TypeMap README: `https://raw.githubusercontent.com/sinclairzx81/typemap/main/readme.md`
- Standard Schema spec: `https://raw.githubusercontent.com/standard-schema/standard-schema/main/packages/spec/README.md`

## Ground Truth Anchors (Repo Evidence)

- TypeBox-first + oRPC Standard Schema adapter pattern:
  - `packages/coordination/src/orpc/schemas.ts:268`
  - `packages/state/src/orpc/contract.ts:41`
- Adapter carries `__typebox` payload for later OpenAPI conversion:
  - `packages/coordination/src/orpc/schemas.ts:288`
  - `packages/state/src/orpc/contract.ts:61`
- Host layer OpenAPI conversion path is explicit (`ConditionalSchemaConverter` + `__typebox` extraction):
  - `apps/server/src/orpc.ts:282`
  - `apps/server/src/orpc.ts:286`
  - `apps/server/src/orpc.ts:295`
- Contract composition remains package-first under `hqContract`:
  - `packages/core/src/orpc/hq-router.ts:5`
- Inngest-trigger execution integration is host/runtime mediated:
  - `apps/server/src/orpc.ts:16`
  - `apps/server/src/orpc.ts:187`

## Planned Edits

1. Replace Zod-first snippets in canonical doc with TypeBox-first snippets aligned to repo idioms.
2. Add explicit conversion-plumbing section that shows:
   - TypeBox schema -> `typeBoxStandardSchema(...)` -> oRPC contract I/O.
   - `__typebox` metadata usage in host OpenAPI conversion (`ConditionalSchemaConverter`).
3. Clarify boundary between package contracts, host adapters, and Inngest execution so no layer is hand-wavy.
4. Run a quality sweep for contradictions and ambiguous “multiple-path” text; keep Path A/B policy but anchor with concrete TypeBox examples.
5. Update acceptance checks so they assert TypeBox-first + explicit converter path, not generic schema language.

## Non-Goals

- No architecture-policy reshaping.
- No implementation/code changes outside docs.
- No edits outside the three owned files.
