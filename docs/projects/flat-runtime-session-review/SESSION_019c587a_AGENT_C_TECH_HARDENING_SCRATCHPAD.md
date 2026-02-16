# SESSION_019c587a — Agent C Tech Hardening Scratchpad

## Scope
- Working file only: `SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md`
- Focus: Inngest, oRPC, Elysia usage correctness + explicit wiring.

## Observations From Assigned Doc (Pre-edit)
1. Good baseline separation exists (domain package vs boundary adapters), but some runtime snippets are too generic (`any`, implicit context creation).
2. oRPC and Elysia mounting snippets omit body-parser caveats (`parse: "none"`) for forwarded `Request` handlers.
3. Inngest section shows step usage but does not call out re-entry/durability risks or stable step ID discipline explicitly.
4. Security and lifecycle claims are implied but not connected to explicit serve/signing and idempotency layers.
5. File ownership is mostly clear, but non-obvious helper wrappers (`createInngestServeHandler`, route registration wrappers) are not shown as first-class examples.

## Repo Pattern Cross-check (Observed)
- Existing host wiring already demonstrates dual oRPC transports and `parse: "none"` forwarding in:
  - `apps/server/src/orpc.ts`
- Existing Inngest wrapper and function bundle live in:
  - `packages/coordination-inngest/src/adapter.ts`
- Existing top-level route composition mounts `/api/inngest` + oRPC routes:
  - `apps/server/src/rawr.ts`

## Skill/Reference Validation Notes
### Inngest
- Durable step model + re-entry behavior validated (`how-functions-are-executed`).
- `serve()` endpoint behavior and methods validated (`serving-inngest-functions`, `serve` reference).
- Idempotency and signing key guidance validated (`handling-idempotency`, `signing-keys`).

### oRPC
- Contract-first (`oc` + `implement`) validated.
- Dual transport handlers and prefix behavior validated (`rpc-handler`, `openapi-handler`).
- OpenAPI route semantics validated (`openapi/routing`).
- Elysia adapter caveat for forwarded body parsing validated (`adapters/elysia`).

### Elysia
- Lifecycle order and plugin scope/encapsulation validated (`essential/life-cycle`, `essential/plugin`).
- OpenAPI plugin preference and Swagger deprecation validated (`patterns/openapi`, `plugins/swagger`).

## Planned Edits to Main Doc
1. Add explicit "Inngest correctness and lifecycle" section with re-entry, stable step IDs, idempotency layers, and endpoint hardening.
2. Replace broad oRPC example with explicit contract -> implement -> router -> handler mount plumbing and prefix alignment caveats.
3. Add Elysia mounting caveats with `parse: "none"` and route registration order caveats.
4. Add non-magical wrapper examples (`registerOrpcRoutes`, `registerInngestRoute`) and file ownership table updates.
5. Add "Validation Notes" section (Observed vs Inferred + key refs).

## Open Questions (Resolved by assumptions)
- Use Bun-first Inngest adapter (`inngest/bun`) as baseline: yes (aligned with existing repo and skills).
- Keep A1/A2 narrative: yes, but harden with explicit wrapper plumbing and constraints.

## Restart Patch (Pure-Domain Constraint Enforcement)

### Why this patch was required
The doc had drifted into scale examples that implied contract/router fragmentation in API plugins (multiple boundary contract files + multiple routers per plugin), which conflicts with the pure-domain Approach A guardrails for this session.

### Exact changes made in target doc
1. Reworked the n>1 scaled tree to keep pure-domain axis boundaries:
   - Package side now keeps a single internal contract surface (`contracts/internal.contract.ts` + `contracts/internal.surface.ts`) and scales via `operations/*.operation.ts` + service modules.
   - Removed plugin-level multi-contract/multi-router shape from the scaled tree.
2. Rewrote "One-file-per-procedure organization (oRPC)" section:
   - Now explicitly shows one `contract.boundary.ts` + one `router.boundary.ts` per API plugin.
   - "One file per procedure" now applies to operation logic files only (`operations/*.operation.ts`).
3. Tightened growth import/dependency table:
   - Added explicit prohibition against extra contract/router files per API plugin.
   - Clarified that growth happens by adding operation logic files/functions/services, not boundary contract/router proliferation.
4. Updated oRPC correctness section with explicit structural invariant:
   - One contract + one router per API plugin, many operation logic files.
5. Updated tradeoff table mitigation language:
   - Replaced prior guidance that implied splitting contracts by bounded context with "single contract/router + split operation logic".
6. Added a dedicated `Conformance Check` section with explicit pass/fail statements for all five hard constraints.

### Constraint mapping
- Constraint 1 (pure-domain axis): satisfied by removing boundary-package-like fragmentation and keeping boundary contracts in plugins.
- Constraint 2 (one contract/router per API plugin): satisfied in scaled tree + procedure organization + conformance section.
- Constraint 3 (one file per procedure = logic only): satisfied by `operations/*.operation.ts` pattern.
- Constraint 4 (boundary contracts at plugin edge): satisfied; API/workflow boundary contracts remain under `plugins/**`.
- Constraint 5 (repair proliferation): satisfied by replacing multi-contract/multi-router scale pattern with operation-module growth pattern.
