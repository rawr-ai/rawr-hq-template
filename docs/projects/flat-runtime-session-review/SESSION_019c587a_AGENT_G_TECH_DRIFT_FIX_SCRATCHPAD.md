# SESSION_019c587a — Agent G Tech Drift Fix Scratchpad

## Scope

- Canonical target doc:
  - `docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md`
- Companion docs for this pass:
  - `docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_G_TECH_DRIFT_FIX_PLAN.md`
  - `docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_G_TECH_DRIFT_FIX_SCRATCHPAD.md`

## Process Tracking (Required A -> E)

- [x] A) Skill introspection + notes logged before doc edits
- [x] B) Repo reality inspection + evidence refs logged before doc edits
- [x] C) Brief fix plan doc written
- [x] D) Progress check-in logged before canonical edits
- [x] E) Canonical doc fixes implemented

## A) Skill Introspection Notes

### Skill: `orpc`

- oRPC is contract-first and JSON Schema-first; contract + implementation + transport exposure must be explicit.
- Distinguish transport layers clearly: `RPCHandler` vs `OpenAPIHandler`.
- If examples drift to alternate schema stacks, explicitly document the bridge instead of silently switching standards.
- Avoid hand-wavy plumbing; show concrete adapter paths and where conversion happens.

### Skill: `inngest`

- Durable execution requires clear step boundaries and idempotent behavior.
- Keep orchestration concerns separate from API contract/schema concerns.
- Document cross-boundary integration explicitly (event contracts, serving boundaries, and reliability implications).

### Skill: `elysia`

- Elysia is Fetch-based and schema-driven; route validation and typed responses are first-class.
- Integration boundaries should call out body handling and adapter handoff behavior where relevant.
- Keep framework edge concerns (mounting, handlers, parse behavior) separate from domain package contracts.

### Skill: `typebox`

- TypeBox is schema-artifact-first (JSON Schema) and should be canonical when the stack is TypeBox-first.
- Runtime + static alignment should come from exported schema artifacts (`Static` typing from shared schema constants).
- If OpenAPI conversion is needed, document concrete converter steps and constraints.

### Skill: `architecture`

- Keep current-state evidence, target-state intent, and transitional mechanics separated but linked.
- Resolve ambiguity by adding explicit decisions and concrete examples, not multiple ungrounded variants.
- Every non-obvious architectural claim should point to code or docs evidence.

### Additional Repo-Relevant Skills Used

- `web-search` (touch-up pass): used to gather primary-source verification for TypeBox vs Standard Schema support posture.

## B) Repo Reality Evidence (Line-Referenced)

### `apps/server/src/orpc.ts`

- oRPC stack in host/server layer is explicit: `implement`, `RPCHandler`, `OpenAPIHandler`, and OpenAPI generator imports are all in use.
  - Evidence: `apps/server/src/orpc.ts:22`, `apps/server/src/orpc.ts:23`, `apps/server/src/orpc.ts:24`, `apps/server/src/orpc.ts:26`
- Inngest queueing is integrated in runtime routing through `queueCoordinationRunWithInngest`.
  - Evidence: `apps/server/src/orpc.ts:16`, `apps/server/src/orpc.ts:187`
- OpenAPI conversion plumbing already includes a TypeBox-aware conditional converter with `__typebox` extraction.
  - Evidence: `apps/server/src/orpc.ts:282`, `apps/server/src/orpc.ts:283`, `apps/server/src/orpc.ts:286`, `apps/server/src/orpc.ts:295`
- Elysia edge registration uses explicit parse passthrough (`parse: "none"`) for RPC/OpenAPI handlers.
  - Evidence: `apps/server/src/orpc.ts:339`, `apps/server/src/orpc.ts:346`, `apps/server/src/orpc.ts:359`, `apps/server/src/orpc.ts:366`

### `packages/coordination/src/orpc/schemas.ts`

- Shared contract schemas are TypeBox-first (`Type.*`, `Static`, `Value`), not Zod-first.
  - Evidence: `packages/coordination/src/orpc/schemas.ts:2`, `packages/coordination/src/orpc/schemas.ts:3`
- A Standard Schema adapter exists and is the bridge from TypeBox to oRPC schema expectations.
  - Evidence: `packages/coordination/src/orpc/schemas.ts:268`
- Adapter includes validation and returns path-aware issues via `SchemaIssue`.
  - Evidence: `packages/coordination/src/orpc/schemas.ts:273`, `packages/coordination/src/orpc/schemas.ts:278`, `packages/coordination/src/orpc/schemas.ts:280`
- Adapter stores raw TypeBox schema on `__typebox` for downstream conversion.
  - Evidence: `packages/coordination/src/orpc/schemas.ts:288`

### `packages/state/src/orpc/contract.ts`

- State contract also follows TypeBox-first + Standard Schema adapter pattern.
  - Evidence: `packages/state/src/orpc/contract.ts:2`, `packages/state/src/orpc/contract.ts:41`, `packages/state/src/orpc/contract.ts:76`, `packages/state/src/orpc/contract.ts:77`
- Contract definition uses oRPC contract router (`oc.router`) and route metadata at contract layer.
  - Evidence: `packages/state/src/orpc/contract.ts:67`, `packages/state/src/orpc/contract.ts:69`

### `packages/core/src/orpc/hq-router.ts`

- Top-level HQ contract composes package contracts directly with `oc.router`.
  - Evidence: `packages/core/src/orpc/hq-router.ts:1`, `packages/core/src/orpc/hq-router.ts:5`
- Composition confirms package-first contract ownership (`coordinationContract`, `stateContract`) rather than server-owned schema definitions.
  - Evidence: `packages/core/src/orpc/hq-router.ts:2`, `packages/core/src/orpc/hq-router.ts:3`, `packages/core/src/orpc/hq-router.ts:6`, `packages/core/src/orpc/hq-router.ts:7`

## D) Pre-Edit Progress Check-In

- Step A/B/C completed in required order; all evidence and fix plan are now anchored to live repo files.
- Canonical doc drift target is clear: replace Zod-first examples with TypeBox-first patterns and make conversion plumbing explicit.
- Next edit pass will stay architecture-neutral and focus on:
  - schema stack correctness,
  - conversion-path clarity,
  - contradiction/ambiguity cleanup,
  - concrete examples where multiple variants are discussed.

## E) Canonical Doc Fixes Applied

### Drift Root-Cause Analysis

- The canonical architecture narrative remained mostly correct, but example snippets drifted toward generic oRPC + Zod patterns (likely copied from common quickstart muscle memory) while the repo implemented TypeBox-first adapters.
- Conversion plumbing existed in runtime code (`__typebox` + host `ConditionalSchemaConverter`) but was not surfaced in the canonical doc, creating a “black box” gap for readers.
- Structure trees and example imports were not synchronized with adapter-specific file layout, which made the TypeBox path under-specified.

### Exact Sections Fixed (`SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md`)

- `Locked Defaults`:
  - Added explicit TypeBox-first contract schema baseline and `__typebox`/OpenAPI conversion requirement.
- `API Plugin Policy`:
  - Added concrete Path A gate language to reduce ambiguity when deciding Path A vs Path B.
- `Workflows Policy` / workflow section labels:
  - Normalized wording to `Inngest` (removed `ingest-first` typo/drift).
- `Canonical n=1 Structure` and `Canonical n>1 Structure`:
  - Initial pass added local adapter helper paths; superseded by the later touch-up centralization pattern (`packages/orpc-standards/src/typebox-standard-schema.ts`).
- Added new section:
  - `Schema + Conversion Plumbing (Explicit, Not Implied)`, including:
    - TypeBox -> oRPC Standard Schema adapter pattern with `__typebox`.
    - Host OpenAPI conversion pattern using `ConditionalSchemaConverter`.
- `End-to-End Example` snippets:
  - Replaced Zod-first domain/API/workflow contract examples with TypeBox-first + `typeBoxStandardSchema(...)` adapter usage.
- `Explicit Contradiction Removals`:
  - Added drift fixes for Zod removal and explicit converter-path documentation.
- `Acceptance Checks`:
  - Added checks requiring TypeBox-first contract examples and explicit `__typebox` -> `ConditionalSchemaConverter` conversion path.

### Unresolved Risks / Questions

- Local helper duplication concern from initial pass is now resolved in touch-up pass via centralized helper pattern.
- Host mounting examples remain architecture-canonical and not a strict file-for-file mirror of the current server layout; this is intentional for architecture readability but should be kept synchronized during implementation follow-through.

### Why Final Doc Is Aligned with oRPC / Inngest / Elysia / TypeBox Reality

- oRPC alignment:
  - Contract-first and router composition model remain intact, now with explicit Standard Schema adapter usage.
- TypeBox alignment:
  - Contract examples now define TypeBox schemas and adapt via `typeBoxStandardSchema(...)`, matching package/state/coordination patterns in repo.
- OpenAPI alignment:
  - Explicitly documents `__typebox` extraction via `ConditionalSchemaConverter` in host oRPC layer, matching `apps/server/src/orpc.ts`.
- Inngest alignment:
  - Trigger-vs-ingress separation remains explicit (`/api/workflows/*` vs `/api/inngest`) with Inngest execution in functions.
- Elysia alignment:
  - Host edge semantics remain clearly separated from package internals; parse/handoff behavior is now anchored in evidence references from host routing layer.

## Touch-Up Pass (Current Request)

### Requested Focus

- Remove repeated helper-writing pattern in examples; document one centralized placement pattern.
- Verify TypeBox Standard Schema support from official sources and capture conclusion.
- Default contract style to inline `input`/`output` schema definitions unless domain reuse clearly warrants extraction.

### Standard Schema Research Notes (TypeBox)

#### Sources checked (official / upstream)

- TypeBox skill doc:
  - `/Users/mateicanavra/.codex-rawr/skills/typebox/SKILL.md`
- TypeBox README (official):
  - `https://github.com/sinclairzx81/typebox`
  - Raw readme inspected:
    - `https://raw.githubusercontent.com/sinclairzx81/typebox/main/readme.md`
- TypeBox Standard Schema example adapter (official repo example):
  - `https://raw.githubusercontent.com/sinclairzx81/typebox/main/example/standard/readme.md`
- TypeMap README (official):
  - `https://github.com/sinclairzx81/typemap`
  - Raw readme inspected:
    - `https://raw.githubusercontent.com/sinclairzx81/typemap/main/readme.md`
- Standard Schema V1 spec (official):
  - `https://github.com/standard-schema/standard-schema`
  - Spec readme inspected:
    - `https://raw.githubusercontent.com/standard-schema/standard-schema/main/packages/spec/README.md`
- Package-level verification via npm tarballs:
  - `npm pack typebox@latest` (no `~standard`/`StandardSchema` hits)
  - `npm pack @sinclair/typemap@latest` (`compile/validator` implements `~standard` interface)

#### Conclusion (explicit)

- TypeBox core schemas are JSON Schema artifacts and do **not** appear to implement Standard Schema V1 directly by default.
- Official TypeBox material demonstrates Standard Schema via an adapter example (`example/standard`), which indicates adapter-path usage rather than built-in direct implementation on TypeBox schema values.
- TypeMap provides Standard Schema-capable validator surfaces (`validator['~standard'].validate(...)`) and can serve as a bridge when that runtime shape is needed.
- For our oRPC stack, the current adapter pattern (`typeBoxStandardSchema(...)`) is the correct/reality-aligned approach, with host OpenAPI conversion using `__typebox`.

### Touch-Up Edits Applied (Current Request)

- Canonical helper placement pattern centralized:
  - replaced per-capability helper file pattern in structure examples with one shared package pattern:
    - `packages/orpc-standards/src/typebox-standard-schema.ts`
    - import surface: `@rawr/orpc-standards`
- Added explicit contract-style default:
  - inline `input`/`output` schemas by default.
  - standalone schema constants only when there is clear reusable domain-schema value.
- Updated all three contract example snippets to inline TypeBox schemas:
  - `packages/invoice-processing/src/contract.ts` snippet
  - `plugins/api/invoice-processing-api/src/contract.boundary.ts` snippet
  - `plugins/workflows/invoice-processing-workflows/src/contract.triggers.ts` snippet
- Updated contradiction-removal and acceptance sections to enforce:
  - centralized adapter import usage,
  - inline schema default,
  - no repeated helper definition pattern in per-contract examples.

### Touch-Up Unresolved Uncertainties

- No blocking uncertainty for this pass.
- Minor nuance: upstream TypeBox docs do not present a single explicit “recommended with oRPC” statement; the adapter path inference is based on official examples + absence of native Standard Schema claims in TypeBox core docs.

## Naming Normalization Pass (Current Request)

### Before/After Decisions (Canonical Doc)

1. `contract.boundary.ts` -> `contract.ts` (API plugin)
- Rationale:
  - Canonical filename is `contract.ts`.
  - Boundary role is now clarified in prose/parentheses (`contract.ts` (boundary contract)) rather than encoded in filename suffix.

2. `contract.triggers.ts` -> `contract.ts` (workflows plugin)
- Rationale:
  - Canonical filename is `contract.ts`.
  - Trigger context moved to prose/section labeling (`contract.ts` (workflow triggers contract)).

3. `router.triggers.ts` -> `router.ts` (workflows plugin)
- Rationale:
  - Canonical filename is `router.ts`.
  - Trigger context remains explicit in prose (`router.ts` (workflow triggers router)).

4. `surface.ts` (API + workflows composition export files) -> `index.ts`
- Rationale:
  - `surface.ts` is potentially misleading (reads like a client/network surface file).
  - Composition export is now canonicalized to `index.ts`, with explicit clarification in prose/comments that this is a composition export and not an HTTP client.

5. `visibility.ts` standalone file -> visibility semantics colocated in `router.ts`
- Rationale:
  - Standalone `visibility.ts` was context-baked and under-explained in canonical examples.
  - Default pattern now folds visibility policy into router semantics; extraction is framed as optional only when broadly reused.

6. `reuse-surface.ts` example file -> `reuse-example.ts` (illustrative-only)
- Rationale:
  - This file is one-off illustrative naming, not canonical.
  - Labeled explicitly as illustrative-only to distinguish example naming from canonical standards.

### Naming Policy Clarifications Added

- Added canonical-vs-illustrative naming section to the canonical doc:
  - canonical defaults (`contract.ts`, `router.ts`, `index.ts`, and `client.ts` only for true clients),
  - contextual qualifiers in prose/parentheses,
  - treatment of legacy/example `surface.ts` and standalone `visibility.ts`.

### Remaining Naming Ambiguity

- No blocking ambiguity remains in the canonical filename examples.
- Minor intentional carryover: the identifier term `invoiceApiSurface` remains as a composition-domain term (not a filename), because “surface” is still used conceptually in policy language; this is now explicitly clarified as non-client composition context.
