# SESSION_019c587a — oRPC Contract Location Re-review

Date: 2026-02-16  
Reviewer: Agent D (independent focused re-review)  
Scope: Pure-domain package approach, with oRPC intent as primary axis; Inngest/Elysia only where they affect contract ownership and boundary purity.

## Observed

### Official oRPC docs (primary)
1. Contract-first in oRPC is explicitly a two-artifact flow: define a contract (`@orpc/contract`) then implement it (`implement(contract)` in `@orpc/server`).
- `https://orpc.dev/docs/contract-first/define-contract`
- `https://orpc.dev/docs/contract-first/implement-contract`

2. Client-side remote clients are transport-link based.
- `RPCLink` targets `RPCHandler` and is HTTP/Fetch-oriented.
- `OpenAPILink` targets `OpenAPIHandler` and OpenAPI semantics.
- `https://orpc.dev/docs/client/client-side`
- `https://orpc.dev/docs/client/rpc-link`
- `https://orpc.dev/docs/openapi/client/openapi-link`

3. oRPC has first-class in-process server-side client APIs.
- `.callable(...)`, `call(...)`, and `createRouterClient(...)` are official no-network invocation patterns.
- `https://orpc.dev/docs/client/server-side`
- `https://orpc.dev/docs/advanced/testing-mocking`

4. oRPC is not HTTP-only in practice.
- Official adapters include message-port/web-workers with dedicated `RPCLink`/`RPCHandler` surfaces.
- `https://orpc.dev/docs/adapters/message-port`
- `https://orpc.dev/docs/adapters/web-workers`

5. oRPC monorepo best-practices present Contract First, Service First, and Hybrid as valid shapes.
- `https://orpc.dev/docs/best-practices/monorepo-setup`

6. Router-to-contract docs explicitly warn about internal logic leakage when exporting router-derived contracts and recommend minification for client import.
- `https://orpc.dev/docs/contract-first/router-to-contract`

### Official Inngest/Elysia evidence affecting boundary placement
1. Inngest `serve()` is an HTTP handler surface and represents boundary ingress for function invocation/registration.
- `https://www.inngest.com/docs/reference/serve`

2. Inngest execution is durable and step-based; non-deterministic work belongs in step boundaries.
- `https://www.inngest.com/docs/learn/how-functions-are-executed`

3. Elysia plugin/lifecycle behavior is instance-scoped and order-sensitive; boundary wiring placement matters.
- `https://elysiajs.com/essential/plugin`
- `https://elysiajs.com/essential/life-cycle`

### Current local docs under review
1. Approach A states package purity and one-way boundary->package dependency.
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:4`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:9`

2. Same doc currently says package owns internal contract as baseline.
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:7`

3. Boundary contract ownership and `implement()` examples are already shown in plugin adapter layer, not package runtime layer.
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:224`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:357`

4. oRPC and Inngest are mounted in app-host wrappers in examples (edge placement).
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:697`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:616`

## Inferred
1. A contract can live in a package without HTTP contamination if the package contract stays transport-neutral (no host mount, no `RPCHandler/OpenAPIHandler`, no Elysia/Inngest ingress wiring).
2. A "client from contract" is real but mode-dependent:
- Remote client needs a transport link configured at boundary/app level.
- In-process client is first-class but requires an implemented router (not contract alone).
3. The current Approach A is broadly compatible with oRPC’s intended model, but its wording risks treating package-internal contracts as mandatory when oRPC itself explicitly supports multiple valid ownership shapes.
4. For a pure-domain baseline, defaulting contract ownership to boundary/API plugins is usually simpler operationally; package contract ownership should be an explicit scaling decision.

## Core questions (explicit answers)

1. If we want a client around a package with no HTTP semantics, can we still produce a usable client from oRPC contracts in that package?
- Answer: Yes, with caveats.
- Known:
  - You can produce typed remote clients from a contract (`ContractRouterClient`) once a boundary provides transport (`RPCLink`/`OpenAPILink`) and endpoint.
  - You can produce in-process clients via `createRouterClient`/`call`, but that requires a concrete implemented router.
- Uncertain:
  - Whether a package-level "client" should exist by default depends on team boundaries and reuse pressure, not on oRPC capability.

2. Are oRPC clients always intended for HTTP transport, or can they be first-class in-process?
- Answer: Not always HTTP. They can be first-class in-process.
- Known:
  - Server-side client APIs are officially documented for no-network calls.
  - Non-HTTP remote transports (message-port/web-workers) are also official.
- Uncertain:
  - Which mode is most common in your org today; docs do not provide usage telemetry.

3. Does the current proposed approach make sense relative to oRPC’s intended usage model?
- Answer: Mostly yes.
- Known:
  - Contract-first + plugin-layer implementation + edge transport mounting aligns with official concepts.
  - Boundary-owned API contracts and app-edge transport wrappers are coherent.
- Caveat:
  - "Package owns internal contract" should be treated as optional/conditional, not universal baseline, to preserve pure-domain framing and avoid unnecessary coupling to oRPC artifacts.

4. Is this well-trodden and practical, or are we overcomplicating it?
- Answer: Both are possible; current shape is practical when justified.
- Known:
  - Contract-first package sharing is a documented, common pattern.
  - Service-first and hybrid are equally first-class in official guidance.
- Inference:
  - Forcing package contract ownership everywhere is overcomplication when there is only one boundary adapter and low contract reuse.

5. Is the more typical pattern that only API/boundary layers own contracts and API impl calls pure domain functions?
- Answer: This is a very typical practical default, but not an oRPC-only mandate.
- Known:
  - oRPC explicitly supports boundary/service-first and contract-first/hybrid.
- Inference:
  - For pure-domain architecture goals, boundary-owned contracts as default plus domain function invocation is usually the cleanest starting model.

## Known vs uncertain

### Known
1. oRPC supports multiple ownership models (contract-first, service-first, hybrid).
2. In-process and remote clients are both first-class.
3. Transport/mount concerns belong at runtime edge layers, not in domain modules.
4. Current A doc already has strong edge-mount discipline for oRPC/Inngest/Elysia.

### Uncertain
1. Exact threshold where package-level internal contract starts paying for itself in this repo.
2. Expected near-term number of consumers per capability (single API plugin vs multiple adapters/clients).
3. Whether existing contributors interpret "pure domain" as excluding framework-level contract artifacts in package space.

## Recommendation for docs (contract placement)

### Keep
1. Boundary API contract ownership in API plugin layer by default.
2. App-host edge ownership for oRPC/Inngest mounting and Elysia forwarding.
3. One API plugin => one contract + one router.

### Change
1. Change wording from mandatory package-internal contract to conditional rule:
- Use package/internal contract when the same capability contract is consumed by 2+ independent adapters/clients or when externalized artifact stability is required.
- Otherwise keep contract in API boundary plugin and call domain services directly.

2. Clarify "client" vocabulary:
- `Remote client` (`createORPCClient` + link) is boundary/app-owned.
- `In-process client` (`createRouterClient`/`call`) is server/test runtime tool and can stay package-internal only when helpful.

### Remove
1. Any implication that package-level contract ownership is always required for pure-domain approach.

## Recommended code-shape models

### Model A (default for pure-domain axis): boundary-owned contract

```text
packages/invoice-processing/src/
  domain/
    service.ts
    types.ts
  index.ts

plugins/api/invoice-processing-api/src/
  contract.boundary.ts
  router.ts
  operations/
    start-invoice.operation.ts
    get-status.operation.ts
  index.ts

apps/server/src/
  orpc/register-routes.ts
```

```ts
// /plugins/api/invoice-processing-api/src/router.ts
import { implement } from "@orpc/server";
import { invoiceBoundaryContract } from "./contract.boundary";
import { createInvoiceService } from "@rawr/invoice-processing";

const os = implement(invoiceBoundaryContract);

export const invoiceBoundaryRouter = os.router({
  startInvoice: os.startInvoice.handler(async ({ input, context }) => {
    return createInvoiceService(context.deps).start(input);
  }),
  getStatus: os.getStatus.handler(async ({ input, context }) => {
    return createInvoiceService(context.deps).getStatus(input.runId);
  }),
});
```

### Model B (conditional promotion): shared internal contract package

Use this when multiple adapters/clients need a stable shared contract artifact.

```text
packages/invoice-processing/src/
  domain/
    service.ts

packages/invoice-processing-contract/src/
  internal.contract.ts
  index.ts

plugins/api/invoice-processing-api/src/
  adapters/
    internal-surface.adapter.ts
  contract.boundary.ts
  router.ts

plugins/workflows/invoice-processing-workflows/src/
  index.ts

apps/web/src/clients/
  invoice-client.ts
```

```ts
// /apps/web/src/clients/invoice-client.ts
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import { invoiceBoundaryContract } from "@rawr/invoice-processing-api-contract";

export const invoiceClient =
  createORPCClient(new RPCLink({ url: "/rpc" })) as ContractRouterClient<typeof invoiceBoundaryContract>;
```

```ts
// /plugins/api/invoice-processing-api/src/adapters/internal-surface.adapter.ts
import { implement } from "@orpc/server";
import { invoiceInternalContract } from "@rawr/invoice-processing-contract";
import { createInvoiceService } from "@rawr/invoice-processing";

const os = implement(invoiceInternalContract);

export const invoiceInternalRouter = os.router({
  start: os.start.handler(async ({ input, context }) => createInvoiceService(context.deps).start(input)),
  getStatus: os.getStatus.handler(async ({ input, context }) => createInvoiceService(context.deps).getStatus(input.runId)),
});
```

### In-process client shape (for tests/server composition)

```ts
// /plugins/api/invoice-processing-api/src/router.test.ts
import { createRouterClient } from "@orpc/server";
import { invoiceBoundaryRouter } from "./router";

const client = createRouterClient(invoiceBoundaryRouter, {
  context: { deps: makeTestDeps() },
});

await client.startInvoice({ invoiceId: "inv_123", requestedBy: "u_1" });
```

## Immediate correction decision
No high-confidence immediate correction is required in the two main approach docs for this pass.  
Recommendation is to apply the wording/ownership clarifications above in the next controlled edit.
