# Axis 01: External Client Generation

## In Scope
- External SDK/client generation ownership.
- Boundary API contract-first defaults.
- OpenAPI artifact generation path from composed boundary router state.

## Out of Scope
- Internal in-process calling defaults (see [AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md](./AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md)).
- Workflow trigger vs durable ingress split (see [AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md](./AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md)).

## Canonical Policy
1. External SDK/client generation MUST come from one composed boundary oRPC/OpenAPI surface.
2. Package-internal contracts MUST NOT be used for external SDK generation.
3. Boundary APIs remain contract-first by default.
4. Workflow/API boundary contracts are plugin-owned. Packages may export shared domain schemas and domain helpers, but workflow trigger/status I/O schemas and caller-facing boundary contract ownership remain in plugins.

## Why
- One contract tree preserves stable external semantics and prevents drift.
- Composed router state is already the runtime source for OpenAPI generation.

## Trade-Offs
- Some internal contracts remain intentionally unexposed.
- This is intentional to preserve boundary ownership and avoid accidental public surface expansion.

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

## Related Normative Rules
1. Preserve TypeBox-first schema flow for oRPC contract I/O and OpenAPI conversion.
2. Centralize shared TypeBox adapter and OpenAPI converter helper usage.

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
