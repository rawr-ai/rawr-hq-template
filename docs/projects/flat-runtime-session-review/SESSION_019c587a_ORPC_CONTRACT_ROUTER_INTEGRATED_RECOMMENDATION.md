# SESSION_019c587a — ORPC Contract-First vs Router-First (Integrated Recommendation)

## Inputs
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_L_CONTRACT_FIRST_RECOMMENDATION.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_M_ROUTER_FIRST_RECOMMENDATION.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`

## Converged Result
Both investigations converge on the same posture:

1. Do **not** switch to pure contract-first everywhere.
2. Do **not** switch to pure router-first everywhere.
3. Adopt a **deliberate/narrowed hybrid**:
- Contract-first default at boundary-owned and externally relevant surfaces.
- Router-first (or service-first) default for internal leaf modules.

This is the highest-confidence model that reduces low-value duplication while preserving all locked posture rules.

## Canonical Model (By Layer)

### 1) Domain/internal package layer
- Default: router-first/service-first acceptable for internal leaf logic.
- Promote to dedicated contract-first when threshold is reached (e.g. multi-caller reuse, compatibility pressure, explicit contract governance need).
- Keep package transport-neutral and aligned with internal client rule.

### 2) API plugin boundary layer
- Default: contract-first.
- Rationale: boundary ownership, OpenAPI/client generation stability, metadata/governance clarity.
- Router-first may be used for local implementation internals, but boundary exposure remains contract-first.

### 3) Workflow plugin trigger layer
- Default: contract-first for caller-facing workflow trigger APIs.
- Durable execution remains Inngest-native (`createFunction`, `step.*`).
- No second first-party trigger authoring path.

### 4) Composition layer
- May use explicit helpers/composers to reduce boilerplate.
- Must preserve one external contract source and split harness boundaries.

## Why This Matches Current Posture Spec
This recommendation is fully compatible with the accepted ORPC+Inngest posture:

- oRPC remains primary boundary/client harness.
- Inngest remains primary durability harness.
- `/api/inngest` remains runtime ingress only.
- External SDK generation remains single-source from composed oRPC/OpenAPI contract.
- Anti-dual-path policy remains intact.

## Direct Answer To “Are we in a weird hybrid now?”
You are not wrong about the confusion risk.

The current shape is defensible **if** we explicitly define where each style is allowed.
Without that rule, it feels like accidental hybrid.
With that rule, it becomes an intentional hybrid with clear benefits.

## Recommended Policy Addition (short)
Add this to canonical policy docs:

1. **Boundary surfaces are contract-first by default** (`plugins/api/*`, workflow trigger APIs).
2. **Internal leaf modules are router/service-first by default** unless promotion criteria are met.
3. **Promotion criteria** for internal modules:
- 2+ independent caller groups,
- compatibility/versioning pressure,
- contract-drift risk requiring explicit artifact governance,
- expected near-term externalization.

## Illustrative Deliberate Hybrid (N=1 and N=3)

### 1) Internal leaf modules (internal packages) — router/service-first

N=1 shape:

```text
packages/invoice-processing/src/internal/
  operations/
    start.ts
  services/
    invoice-service.ts
  router.ts
```

N=3 shape (scaled):

```text
packages/invoice-processing/src/internal/
  operations/
    start.ts
    get-status.ts
    cancel.ts
    index.ts
  services/
    invoice-service.ts
  router.ts
  index.ts
```

Example operation (router/service-first, no separate contract artifact):

```ts
// packages/invoice-processing/src/internal/operations/start.ts
import { os } from "@orpc/server";
import { Type } from "typebox";
import { typeBoxStandardSchema } from "@rawr/orpc-standards";
import { startInvoice } from "../services/invoice-service";

export type InternalContext = {
  deps: {
    newRunId: () => string;
    saveRun: (run: { runId: string; invoiceId: string }) => Promise<void>;
  };
};

const o = os.$context<InternalContext>();

export const startMeta = {
  kind: "internal-op",
  capability: "invoicing",
} as const;

export const start = o
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
          accepted: Type.Literal(true),
        },
        { additionalProperties: false },
      ),
    ),
  )
  .handler(async ({ input, context }) => {
    return startInvoice(context.deps, input);
  });
```

```ts
// packages/invoice-processing/src/internal/router.ts
import { start, startMeta } from "./operations/start";
import { getStatus, getStatusMeta } from "./operations/get-status";
import { cancel, cancelMeta } from "./operations/cancel";

export const internalRouter = { start, getStatus, cancel } as const;
export const internalRouterMeta = {
  start: startMeta,
  getStatus: getStatusMeta,
  cancel: cancelMeta,
} as const;
```

Where authoring primarily happens:
1. Input/output schemas: in each `operations/*.ts`.
2. Metadata schema/object: in each `operations/*.ts` (for example `startMeta`).
3. Implementation logic: in service modules (`services/*`), called by operation handlers.

### 2) API plugin / workflow trigger API — contract-first

N=1 shape:

```text
plugins/api/invoice-api/src/
  contract.ts
  router.ts
```

N=3 shape (scaled):

```text
plugins/api/invoice-api/src/
  contracts/
    start.contract.ts
    get-status.contract.ts
    cancel.contract.ts
  handlers/
    start.handler.ts
    get-status.handler.ts
    cancel.handler.ts
  contract.ts
  router.ts
  index.ts
```

Boundary contract (authoring source of truth for caller-facing shape):

```ts
// plugins/api/invoice-api/src/contracts/start.contract.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { typeBoxStandardSchema } from "@rawr/orpc-standards";

export const startContract = oc
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
  );
```

```ts
// plugins/api/invoice-api/src/contract.ts
import { oc } from "@orpc/contract";
import { startContract } from "./contracts/start.contract";
import { getStatusContract } from "./contracts/get-status.contract";
import { cancelContract } from "./contracts/cancel.contract";

export const invoiceApiContract = oc.router({
  startInvoiceProcessing: startContract,
  getInvoiceProcessingStatus: getStatusContract,
  cancelInvoiceProcessing: cancelContract,
});
```

```ts
// plugins/api/invoice-api/src/router.ts
import { implement } from "@orpc/server";
import { invoiceApiContract } from "./contract";
import { startHandler } from "./handlers/start.handler";
import { getStatusHandler } from "./handlers/get-status.handler";
import { cancelHandler } from "./handlers/cancel.handler";

export type InvoiceApiContext = {
  internal: {
    start: (input: { invoiceId: string; requestedBy: string }) => Promise<{ runId: string; accepted: true }>;
    getStatus: (input: { runId: string }) => Promise<{ runId: string; status: string }>;
    cancel: (input: { runId: string }) => Promise<{ accepted: true }>;
  };
};

const os = implement<typeof invoiceApiContract, InvoiceApiContext>(invoiceApiContract);

export function createInvoiceApiRouter() {
  return os.router({
    startInvoiceProcessing: os.startInvoiceProcessing.handler(startHandler),
    getInvoiceProcessingStatus: os.getInvoiceProcessingStatus.handler(getStatusHandler),
    cancelInvoiceProcessing: os.cancelInvoiceProcessing.handler(cancelHandler),
  });
}
```

Where authoring primarily happens:
1. Input/output schemas + HTTP metadata: `contracts/*.contract.ts`.
2. Implementation handling: `handlers/*.handler.ts` (or directly in `router.ts` for small N=1).
3. Composition of contract vs implementation mapping: `contract.ts` + `router.ts`.

What changes under deliberate hybrid:
1. Internal leaf modules can stay router/service-first by default.
2. Boundary APIs/workflow trigger APIs remain contract-first (unchanged default).
3. This is the side-by-side rule that prevents accidental “three-layer confusion.”

## Not Yet Integrated Elsewhere
Still pending back-port/integration into canonical E2E docs:

1. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_H_DX_SIMPLIFICATION_REVIEW.md`
2. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
3. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_L_CONTRACT_FIRST_RECOMMENDATION.md`
4. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_M_ROUTER_FIRST_RECOMMENDATION.md`
