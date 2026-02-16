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
