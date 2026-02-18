# Axis 01: External Client Generation

## In Scope
- External SDK/client generation ownership.
- Boundary API contract-first defaults.
- OpenAPI artifact generation path from composed boundary router state.

## Out of Scope
- Internal in-process calling defaults (see [AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md](./AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md)).
- Workflow trigger vs durable ingress split (see [AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md](./AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md)).

## Canonical Policy
1. Externally published SDK/client generation MUST come from OpenAPI boundary surfaces only (`/api/orpc/*`, `/api/workflows/<capability>/*`).
2. `/rpc` is first-party/internal transport only. `RPCLink` clients and RPC client artifacts MUST NOT be externally published.
3. First-party callers (including MFEs by default) SHOULD use `RPCLink` on `/rpc` unless an explicit exception is documented.
4. Boundary APIs remain contract-first by default.
5. Workflow/API boundary contracts are plugin-owned. Packages may export shared domain schemas and domain helpers, but workflow trigger/status I/O schemas and caller-facing boundary contract ownership remain in plugins.
6. Browser/network callers MUST NOT target `/api/inngest`; runtime ingress is not a client publication surface.
7. No dedicated `/rpc/workflows` mount is required by default; workflow RPC procedures compose under the existing `/rpc` surface when first-party workflow RPC is needed.

## Caller Transport and Publication View
| Caller class | Contract source | Link + route | Publication boundary | Auth mode | Forbidden routes |
| --- | --- | --- | --- | --- | --- |
| First-party callers (MFE default, internal services, CLI) | internal composed contracts | `RPCLink` -> `/rpc` | Internal only (never externally published) | first-party boundary session or trusted service context | `/api/inngest` |
| External/third-party callers | `plugins/api/<capability>/src/contract.ts`, `plugins/workflows/<capability>/src/contract.ts` | `OpenAPILink` -> `/api/orpc/*`, `/api/workflows/<capability>/*` | Externally published OpenAPI clients | boundary auth/session/token | `/rpc`, `/api/inngest` |
| Runtime ingress | Inngest runtime bundle | Inngest callback -> `/api/inngest` | Runtime-only (not a caller SDK) | signed ingress verification | `/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*` |

## Why
- OpenAPI publication stays deterministic and auditable for external integrators.
- Internal RPC semantics stay decoupled from external publication concerns.
- Contract source ownership stays aligned with plugin-owned boundary routes.

## Trade-Offs
- Internal RPC contracts remain intentionally unexposed externally.
- First-party MFE exceptions to OpenAPI require explicit documentation.

## Boundary Plugin Default (Contract-First + Explicit Operations)
```text
plugins/api/<capability>/src/
  contract.ts
  operations/*
  router.ts
  index.ts
```

### Boundary role ownership
- `contract.ts`: caller-facing contract surface.
- `operations/*`: explicit boundary operation behavior.
- `router.ts`: `implement(contract)` binding.
- `index.ts`: export surface consumed by composition root.

## Canonical Snippets

### Root contract composition anchor
```ts
// packages/core/src/orpc/hq-router.ts
import { oc } from "@orpc/contract";
import { coordinationContract } from "@rawr/coordination/orpc";
import { stateContract } from "@rawr/state/orpc";

export const hqContract = oc.router({
  coordination: coordinationContract,
  state: stateContract,
});
```

### OpenAPI generation from composed router
```ts
// apps/server/src/orpc.ts
const generator = new OpenAPIGenerator({
  schemaConverters: [typeBoxSchemaConverter],
});

return generator.generate(router, {
  info: { title: "RAWR HQ ORPC API", version: "1.0.0" },
  servers: [{ url: baseUrl }],
});
```

### Contract-first boundary implementation
```ts
// plugins/api/invoicing/src/contract.ts
export const invoiceApiContract = oc.router({
  startInvoiceProcessing: oc
    .route({ method: "POST", path: "/invoices/processing/start" })
    .input(schema({ invoiceId: Type.String(), requestedBy: Type.String() }))
    .output(schema({ runId: Type.String(), accepted: Type.Boolean() })),
});
```

```ts
// plugins/api/invoicing/src/operations/start.ts
export async function startInvoiceOperation(
  context: InvoiceApiContext,
  input: { invoiceId: string; requestedBy: string },
) {
  return context.invoice.start(input);
}
```

### Router binding and composed export
```ts
// plugins/api/invoicing/src/router.ts
const os = implement<typeof invoiceApiContract, InvoiceApiContext>(invoiceApiContract);

export function createInvoiceApiRouter() {
  return os.router({
    startInvoiceProcessing: os.startInvoiceProcessing.handler(({ context, input }) =>
      startInvoiceOperation(context, input),
    ),
  });
}
```

```ts
// plugins/api/invoicing/src/index.ts
export const invoiceApiSurface = {
  contract: invoiceApiContract,
  router: createInvoiceApiRouter(),
} as const;
```

### First-party default client usage (`RPCLink` on `/rpc`)
```ts
// plugins/web/invoicing-console/src/client.ts
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { capabilityClients } from "@rawr/composition/manifest-generator";

export function createFirstPartyClients(baseUrl: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  return {
    api: createORPCClient(capabilityClients.invoicing.api, {
      link: new RPCLink({
        url: `${normalizedBaseUrl}/rpc`,
        fetch: (request, init) => fetch(request, { ...init, credentials: "include" }),
      }),
    }),
    workflows: createORPCClient(capabilityClients.invoicing.workflows, {
      link: new RPCLink({
        url: `${normalizedBaseUrl}/rpc`,
        fetch: (request, init) => fetch(request, { ...init, credentials: "include" }),
      }),
    }),
  } as const;
}
```

### External published client usage (`OpenAPILink`)
```ts
// plugins/web/invoicing-console/src/client.ts
import { createORPCClient } from "@orpc/client";
import { OpenAPILink } from "@orpc/openapi-client/fetch";

const api = createORPCClient(capabilityClients.invoicing.api, {
  link: new OpenAPILink({ url: `${baseUrl}/api/orpc` }),
});

const workflows = createORPCClient(capabilityClients.invoicing.workflows, {
  link: new OpenAPILink({ url: `${baseUrl}/api/workflows` }),
});
```

## Related Normative Rules
1. Preserve TypeBox-first schema flow for oRPC contract I/O and OpenAPI conversion.
2. Centralize shared TypeBox adapter and OpenAPI converter helper usage.
3. Keep externally published client generation on composed plugin-owned OpenAPI boundary contracts.
4. Keep `RPCLink` clients internal-only and out of external publication artifacts.

## References
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts:5`
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:282`
- oRPC: [OpenAPI handler](https://orpc.dev/docs/openapi/openapi-handler)
- oRPC: [OpenAPI client](https://orpc.dev/docs/openapi/client)
- oRPC: [OpenAPI specification](https://orpc.dev/docs/openapi/openapi-specification)

## Cross-Axis Links
- Internal call defaults: [AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md](./AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md)
- Host composition wiring: [AXIS_07_HOST_HOOKING_COMPOSITION.md](./AXIS_07_HOST_HOOKING_COMPOSITION.md)
- Workflow/API boundary split: [AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md](./AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md)
- Micro-frontend walkthrough: [E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md](./examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md)
