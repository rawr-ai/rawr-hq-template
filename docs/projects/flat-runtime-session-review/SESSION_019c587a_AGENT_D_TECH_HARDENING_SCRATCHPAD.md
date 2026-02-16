# SESSION_019c587a Agent D Tech Hardening Scratchpad

## Constraints / Guardrails
- Edit only:
  - Assigned doc.
  - This scratchpad.
  - Agent D plan file.
- Do not modify other in-flight agent files.

## Read status
- Assigned doc read fully: yes.
- Required skills read: yes.
  - `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/elysia/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/plugin-architecture/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/rawr-hq-orientation/SKILL.md`

## Official-doc validation checkpoints (from skill-linked sources)
- Inngest
  - Durable execution + step model:
    - https://www.inngest.com/docs/learn/how-functions-are-executed
    - https://www.inngest.com/docs/learn/inngest-steps
  - Bun/Elysia serve boundary:
    - https://www.inngest.com/docs/learn/serving-inngest-functions
    - https://www.inngest.com/docs/reference/serve
  - Reliability and idempotency:
    - https://www.inngest.com/docs/guides/handling-idempotency
    - https://www.inngest.com/docs/guides/concurrency
  - Security:
    - https://www.inngest.com/docs/platform/signing-keys
    - https://www.inngest.com/docs/events/creating-an-event-key

- oRPC
  - Contract-first + implement:
    - https://orpc.dev/docs/contract-first/define-contract
    - https://orpc.dev/docs/contract-first/implement-contract
  - Transports:
    - https://orpc.dev/docs/rpc-handler
    - https://orpc.dev/docs/openapi/openapi-handler
  - Elysia adapter:
    - https://orpc.dev/docs/adapters/elysia

- Elysia
  - Lifecycle / plugin encapsulation:
    - https://elysiajs.com/essential/life-cycle
    - https://elysiajs.com/essential/plugin
  - Mount/fetch interop:
    - https://elysiajs.com/patterns/mount

## Local-repo reality checks used for plausibility
- ORPC mounting with parse none and prefix alignment:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/apps/server/src/orpc.ts`
- Inngest serve endpoint mount in Elysia:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/apps/server/src/rawr.ts`
- Inngest function + step.run boundaries + event queue:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/packages/coordination-inngest/src/adapter.ts`
- ORPC contract shape with `.route()` and TypeBox bridge:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/packages/coordination/src/orpc/contract.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/packages/coordination/src/orpc/schemas.ts`

## Hardening gaps identified in assigned doc
1. Hidden runtime machinery
- `createInvoiceOrpcSurface`, `registerInvoiceProcessingWorkflowPlugin`, `mountOrpcFromManifest`, `mountInngestFromManifest` were referenced but not shown.

2. Elysia caveats were implicit
- No explicit `parse: "none"` in mount snippet for forwarded RPC/OpenAPI handlers.
- No explicit prefix-alignment warning for `/rpc` + `/api/orpc`.

3. Inngest lifecycle guidance under-specified
- Needed explicit statements on re-entry semantics, stable step IDs, side-effect placement, and ingress security keys.

4. Ownership layout not explicit enough
- Needed exact file-level ownership for contract vs implement vs host mount wrappers.

## Planned concrete additions
- Add explicit boundary runtime files:
  - `runtime/orpc-surface.ts`
  - `runtime/inngest-surface.ts`
  - `runtime/plugin-wrappers.ts`
  - plus explicit host-side mount module (`apps/server/src/manifest-mounts.ts`)
- Add complete code snippets for:
  - contract -> implement -> router pipeline.
  - Elysia mount wiring for `/rpc`, `/api/orpc`, `/api/inngest`.
  - Inngest event send + createFunction consumption.
- Add dedicated sections:
  - Inngest correctness and lifecycle details.
  - oRPC contract/implementation/transport correctness.
  - Elysia mounting and adapter caveats.
  - Validation Notes (Observed vs Inferred + references).

## User hard-requirement follow-up (plurality n>1)
Implemented directly in assigned doc:
- Added scaled file tree variant with multiple contracts/routers/functions/clients.
- Added one-file-per-function organization examples for both Inngest and ORPC registries.
- Added domain service evolution into a suite/library with port boundaries.
- Added stable import/dependency patterns under growth + capability-level composition snippet.

## Audit Pass: Pure-Domain Doc (Review-only)
Target:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md`

Audit rules applied:
1. Pure-domain axis only (no boundary-package architecture contamination).
2. One API plugin => one contract + one router.
3. One-file-per-procedure only for operations logic modules (not contract-per-procedure, not multiple routers per plugin).
4. oRPC compatibility with contract-first and realistic Elysia mounting.

Findings:

### [F1] n>1 package-internal contracts are split per procedure (violates Rule 3)
- Evidence:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:106`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:107`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:108`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:109`
- Problem:
  - Scaled tree shows `contracts/internal/start.contract.ts`, `status.contract.ts`, `cancel.contract.ts` (contract-per-procedure shape).
- Precise edit needed:
  - Collapse to a single internal contract artifact for the package, e.g.:
    - `packages/invoice-processing/src/contracts/internal.contract.ts`
    - optional helper files for shared schema fragments are fine, but not one contract file per procedure.

### [F2] API plugin is modeled with multiple contracts + multiple routers (violates Rules 2 and 3)
- Evidence (scaled tree):
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:132`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:133`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:134`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:136`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:137`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:138`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:139`
- Evidence (explicit section):
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:180`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:184`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:185`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:188`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:189`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:190`
- Problem:
  - `contracts/runs.contract.ts` + `reconciliation.contract.ts` and `routers/runs.router.ts` + `reconciliation.router.ts` + `status.router.ts` imply one plugin owning multiple boundary contracts and multiple router artifacts.
- Precise edit needed:
  - Keep one boundary contract + one router per API plugin:
    - `plugins/api/invoice-processing-api/src/contract.boundary.ts`
    - `plugins/api/invoice-processing-api/src/router.boundary.ts`
  - Move one-file-per-procedure to operations logic modules only, e.g.:
    - `plugins/api/invoice-processing-api/src/operations/start-invoice.operation.ts`
    - `plugins/api/invoice-processing-api/src/operations/force-reconcile.operation.ts`
    - router imports operations and binds handlers.

### [F3] Example helper `buildInvoiceBoundaryRouters` encodes multi-router topology in one plugin (violates Rule 2)
- Evidence:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:195`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:201`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:203`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:204`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:205`
- Problem:
  - Function returns multiple routers (`runs`, `reconciliation`, `status`) for one API plugin.
- Precise edit needed:
  - Replace with single router constructor, e.g. `buildInvoiceBoundaryRouter(context)` returning one router object bound to one contract.

### [F4] Rule 4 check (oRPC + Elysia) passes; no violation
- Evidence:
  - Contract-first usage shown with `oc.router` + `implement(...)`: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:340`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:391`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:494`.
  - Elysia mount realism includes both root/wildcard mounts and `{ parse: "none" }`: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:711`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:719`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:727`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:735`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:633`.

Audit result summary:
- Violations found: yes (F1, F2, F3).
- Violations not found for Rule 4 (F4 pass).

## Audit Pass (latest A revision) — 2026-02-16
Target:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md`

Check 1) Pure-domain axis not contaminated by boundary-package approach in implementation sections
- Verified pure-domain framing and boundary-at-plugin edge:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:4`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:8`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:217`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:229`

Check 2) One API plugin => one contract + one router
- Verified in scaled structure and explicit growth rule:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:124`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:125`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:171`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:172`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:213`

Check 3) One-file-per-operation is logic-only (not per-contract/per-router fragmentation)
- Verified operation-file guidance and examples are logic-only:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:168`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:173`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:174`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:175`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:176`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:213`

Check 4) oRPC usage remains sane/compatible
- Verified contract-first and realistic Elysia mounting discipline:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:320`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:371`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:475`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:518`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:621`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:692`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:700`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:708`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:716`

No violations found.

## Focused re-review: oRPC contract location and intent (2026-02-16)

### Inputs reopened for this pass
- oRPC skill:
  - `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/orpc/references/contract-first.md`
  - `/Users/mateicanavra/.codex-rawr/skills/orpc/references/overview.md`
  - `/Users/mateicanavra/.codex-rawr/skills/orpc/references/testing-and-mocking.md`
  - `/Users/mateicanavra/.codex-rawr/skills/orpc/references/monorepo-setup.md`
- Supporting boundary-runtime skills:
  - `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/elysia/SKILL.md`
- Target docs re-read:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_SERVICE_MODULE_DESIGN_REVIEW.md`

### Observed (official docs, primary)
1. Contract-first is explicitly split into define-contract (`@orpc/contract`) then implement-contract (`implement(contract)` in `@orpc/server`).
- `https://orpc.dev/docs/contract-first/define-contract`
- `https://orpc.dev/docs/contract-first/implement-contract`

2. Remote client-side usage is link-based and transport-specific:
- `RPCLink` targets `RPCHandler` and uses HTTP/Fetch semantics.
- `OpenAPILink` targets `OpenAPIHandler` and OpenAPI semantics.
- `https://orpc.dev/docs/client/client-side`
- `https://orpc.dev/docs/client/rpc-link`
- `https://orpc.dev/docs/openapi/client/openapi-link`

3. oRPC also provides first-class in-process server-side clients:
- `.callable(...)`, `call(...)`, `createRouterClient(...)` call procedures without network/proxy.
- `https://orpc.dev/docs/client/server-side`
- `https://orpc.dev/docs/advanced/testing-mocking`

4. oRPC is not HTTP-only: official adapters include message-port and web-workers links/handlers.
- `https://orpc.dev/docs/adapters/message-port`
- `https://orpc.dev/docs/adapters/web-workers`

5. Monorepo guidance explicitly presents three valid ownership shapes: Contract First, Service First, Hybrid.
- `https://orpc.dev/docs/best-practices/monorepo-setup`

6. Router-to-contract docs warn about leaking internal logic when deriving contract from router; minification/export is called out for safe client import.
- `https://orpc.dev/docs/contract-first/router-to-contract`

7. Inngest `serve()` is an HTTP edge handler and Inngest execution is step-durable with replay/memoization constraints.
- `https://www.inngest.com/docs/reference/serve`
- `https://www.inngest.com/docs/learn/how-functions-are-executed`

8. Elysia plugin/lifecycle model is order- and scope-sensitive; plugin lifecycle is isolated by default.
- `https://elysiajs.com/essential/plugin`
- `https://elysiajs.com/essential/life-cycle`

### Observed (current local doc shape)
1. Approach A currently states package is pure domain/service but also says package owns internal contract.
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:4`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:7`

2. Boundary API contract ownership is shown at plugin edge and `implement()` mapping is in plugin adapters.
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:224`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:225`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:367`

3. App-host edge mounting for oRPC/Inngest is explicitly modeled with Elysia forwarding and parse-none handling.
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:537`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:614`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:641`

4. Service-module review doc still flags an older contradiction ("package internals instantiate implement()"), but latest A doc now places this in plugin adapter examples.
- Review claim: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_SERVICE_MODULE_DESIGN_REVIEW.md:8`
- Latest A plugin adapter placement: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:357`

### Inferred reasoning trail
1. A package can own oRPC contract artifacts while staying HTTP-neutral if contract definitions avoid HTTP route semantics (`.route`) and transport wiring.
2. A usable "client" from package-level contract is possible in two modes:
- Remote typed client: yes, but transport link and URL/port ownership must stay at boundary/app layer.
- In-process client: yes, via server-side APIs (`createRouterClient`/`call`) once an implementation router exists.
3. oRPC usage in current A shape is broadly compatible with intended model, but the docs should avoid implying package-level contracts are mandatory for all capabilities.
4. Typical practical default (especially for pure-domain emphasis) is boundary/API layer owns contract + router and calls pure domain functions; package-level contract becomes a scaling choice, not baseline doctrine.
5. No immediate must-fix correction in main approach docs is required right now; recommendation-level refinements are better captured in decision memo first.

### Candidate follow-up edits (not applied yet)
1. Soften mandatory phrasing:
- From "Package also owns an internal contract" to "Package may own a shared internal contract when multiple boundary surfaces/clients require a stable shared artifact."
- Target: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:7`

2. Clarify package `clients/*` semantics:
- Keep package clients transport-agnostic (in-process helpers or transport-injected factories), not hardcoded HTTP URLs.
- Target: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:228`

3. Reconcile stale contradiction note in service-review doc against latest A revision.
- Target: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_SERVICE_MODULE_DESIGN_REVIEW.md:8`
