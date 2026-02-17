# SESSION_019c587a — Integrated ORPC Recommendation

This is the converged recommendation for authoring ORPC capability packages and boundary plugins without introducing branching guidance or architecture churn.

## Recommendation
Use a **hybrid by layer, not by confusion**:
1. Internal pure packages default to a single capability boundary with this shape: **Domain / Service / Procedures / Router+Client+Errors / Index**.
2. Boundary API and workflow-trigger plugins remain **contract-first**.
3. Inngest ingress remains separate from workflow-trigger API surfaces (`/api/inngest` is not merged with `/api/workflows/...`).
4. API plugins may adopt a package surface in high-overlap cases, but default behavior is boundary-owned contract wrapping package client calls.
5. One scale rule: **split implementation handlers before splitting contracts**.

## Internal Package Default (One Capability Boundary)
Use one package per capability (example: `invoice-processing`) with pure internals and an explicit internal RPC surface.

```text
packages/invoice-processing/src/
  domain/
    invoice.ts
    invoice-status.ts
  service/
    lifecycle.ts
    status.ts
    cancellation.ts
    index.ts
  procedures/
    start.ts
    get-status.ts
    cancel.ts
    index.ts
  router.ts
  client.ts
  errors.ts
  index.ts
```

Authoring intent by layer:
- `domain/*`: entities, value objects, invariants only; transport-neutral.
- `service/*`: pure business/use-case logic; no HTTP/oRPC/Inngest runtime wiring.
- `procedures/*`: internal RPC boundary; ORPC schemas, middleware, and handlers.
- `router.ts`: composition only.
- `client.ts`: default internal call path via `createRouterClient(...)`.
- `errors.ts`: shared typed errors/mappers.
- `index.ts`: explicit stable package surface.

## ORPC + TypeBox + Standard Schema Posture
Keep schemas local to procedure/contract definitions using TypeBox wrapped with Standard Schema adapters.

```ts
// packages/invoice-processing/src/procedures/start.ts
import { os } from "@orpc/server";
import { Type } from "typebox";
import { typeBoxStandardSchema } from "@rawr/orpc-standards";
import { startInvoice } from "../service";
import type { InvoiceProcedureContext } from "../router";

const o = os.$context<InvoiceProcedureContext>();

export const startProcedure = o
  .input(
    typeBoxStandardSchema(
      Type.Object(
        {
          invoiceId: Type.String({ minLength: 1 }),
          requestedBy: Type.String({ minLength: 1 }),
        },
        { additionalProperties: false },
      ),
    ),
  )
  .output(
    typeBoxStandardSchema(
      Type.Object(
        {
          runId: Type.String({ minLength: 1 }),
          accepted: Type.Boolean(),
        },
        { additionalProperties: false },
      ),
    ),
  )
  .handler(({ context, input }) => startInvoice(context.deps, input));
```

## Boundary Plugin Default (Contract-First)
Boundary plugins define outward-facing contracts and route implementations to operations that call package clients.

```text
plugins/api/invoice-api/src/
  contract.ts
  operations/
    start.ts
    get-status.ts
    cancel.ts
  router.ts
  index.ts
```

```ts
// plugins/api/invoice-api/src/contract.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { typeBoxStandardSchema } from "@rawr/orpc-standards";

export const invoiceApiContract = oc.router({
  startInvoiceProcessing: oc
    .route({ method: "POST", path: "/invoices/processing/start" })
    .input(
      typeBoxStandardSchema(
        Type.Object(
          {
            invoiceId: Type.String({ minLength: 1 }),
            requestedBy: Type.String({ minLength: 1 }),
            traceToken: Type.Optional(Type.String()),
          },
          { additionalProperties: false },
        ),
      ),
    )
    .output(
      typeBoxStandardSchema(
        Type.Object(
          {
            runId: Type.String({ minLength: 1 }),
            accepted: Type.Boolean(),
          },
          { additionalProperties: false },
        ),
      ),
    ),
});
```

```ts
// plugins/api/invoice-api/src/router.ts
import { implement } from "@orpc/server";
import { invoiceApiContract } from "./contract";
import { startInvoiceOperation } from "./operations/start";

const os = implement(invoiceApiContract);

export const invoiceApiRouter = os.router({
  startInvoiceProcessing: os.startInvoiceProcessing.handler(({ context, input }) =>
    startInvoiceOperation(context, input),
  ),
});
```

## Adoption Rule (High-Overlap Exception)
Default behavior is unchanged: boundary `contract.ts` is owned by the boundary and wraps package client usage.  
Exception: when boundary semantics are effectively 1:1 with package internals, the API plugin may adopt/derive more directly from package surface to reduce duplication.

## Scale Rule
When complexity grows, split `operations/*` handlers first. Keep one boundary `contract.ts` as the outward source of truth unless a true contract boundary change is required.

## Agent and Human Workflow Guidance
1. If behavior/invariants change, start in `domain/*` and `service/*`.
2. If internal invocation shape changes, update `procedures/*`, then package `router.ts`/`client.ts`.
3. If external API/workflow trigger behavior changes, update boundary `contract.ts` and corresponding `operations/*`.
4. Keep router files composition-only.
5. Keep Inngest ingress and workflow-trigger APIs separate by design.

## Why This Avoids Thrash
- It removes false either/or decisions (router-first vs contract-first everywhere) and assigns each approach to the correct layer.
- It keeps internal evolution fast (service/procedure changes) without destabilizing external contracts.
- It preserves boundary clarity: API/workflow triggers remain explicit contracts, while internal packages stay pure and reusable.
- It scales predictably with one rule (split handlers before contracts), avoiding premature fragmentation.

## What To Do Next
1. Treat this as the default authoring recommendation for new capability work.
2. Align current package/plugin examples to the two trees above and canonical file names (`contract.ts`, `router.ts`, `client.ts`, `errors.ts`, `index.ts`).
3. Promote this narrative into the upcoming spec as the baseline posture, then add capability-specific details separately.
