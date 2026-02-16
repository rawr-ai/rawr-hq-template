# SESSION_019c587a: Package Approach B (Boundary/Runtime-Centric) End-to-End

## Position (Agent B)
I oppose the strict model "packages are pure domain logic only."  
Approach B keeps domain purity where it matters, but intentionally extends the **package layer** to include boundary/runtime-oriented packages that own contract + runtime integration primitives.

This still preserves:
- one global composition authority (`rawr.hq.ts`),
- no runtime plugin-to-plugin imports,
- thin host mounts.

## Clarification Critique Axis (Agree, Diverge, Tradeoff)
The clarification is treated here as a critique target, not a binding requirement for Approach B.

Where I agree:
1. Domain schemas/types should stay domain-native and stable.
2. Domain package should expose an internal contract that is not forced to mirror API/workflow/event contracts.
3. One-way dependency direction (`boundary -> domain`) is a strong safety rail.

Where I diverge:
1. I do not agree that package layer should stop at domain-only ownership; boundary/runtime primitives should also be package-owned (in explicit boundary packages).
2. I do not treat inline-only IO contract shape as universally best. Inline shape reduces file count, but extracted shared boundary modules are sometimes safer when many endpoints reuse the same boundary schema.

Exact tradeoff:
- More package modules and versioning discipline, in exchange for significantly lower adapter drift across API/workflow/web/cli/tests.

## Claim Posture (Observed vs Inferred)
### Observed
- Locked proposal currently enforces package authoring + plugin runtime split + `rawr.hq.ts` composition authority + no plugin runtime imports: `docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:19`, `docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:23`, `docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:27`, `docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:46`.
- Spec packet treats manifest as architecture boundary and keeps plugin import boundary strict: `docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md:42`, `docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md:95`, `docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md:135`.
- Today-state runtime boundary glue remains app-heavy (`rawr.ts`, `orpc.ts`) and `hqContract` is already package-owned: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:101`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:104`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts:5`.
- Transcript records package-purity concern, single composition path requirement, and contract ownership friction: `/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md:400`, `/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md:413`, `/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md:4906`, `/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md:5441`.

### Inferred
- The real problem is repeated boundary glue ownership, not domain model purity itself.
- A domain-package + boundary-package split can satisfy your stability constraints while reducing adapter drift across API/workflows/tests.
- Deferring helper abstraction (`D-004`) suggests unresolved boilerplate pressure that this model addresses.

## Approach B (Revised): Domain Core + Boundary Packages
Per capability, create two package types:
1. `*-domain` package: stable core (domain types, aggregates, logic, internal contract).
2. `*-boundary` package: API/workflow/event contracts + runtime integration primitives.

Plugins remain deployment wrappers. `rawr.hq.ts` remains global composer.

## Contract Ownership Across Domain/API/Workflow
| Artifact | Owner | Notes |
| --- | --- | --- |
| Domain entities, value objects, aggregate types | `packages/<capability>-domain` | Stable, reusable, boundary-agnostic |
| Internal domain contract | `packages/<capability>-domain` | Not required to match API/workflow shape |
| API contract (including IO shape) | `packages/<capability>-boundary` | IO shape embedded inline in contract definition |
| Workflow/event contract (including payload shape) | `packages/<capability>-boundary` | Inline payload shape and semantics |
| Runtime surface primitives (`implement`, `createFunction`) | `packages/<capability>-boundary/runtime/*` | Reusable glue owned once |
| Plugin policy wrappers | `plugins/<surface>/<capability>*` | Auth/flags/operational policy only |
| Cross-capability composition | `rawr.hq.ts` | Single assembly authority |
| Host mounting | `apps/server` | Mount-only responsibility |

## End-to-End File Tree (Concrete)
```text
.
├── packages/
│   ├── invoice-processing-domain/
│   │   └── src/
│   │       ├── types.ts
│   │       ├── service.ts
│   │       ├── internal-contract.ts
│   │       └── index.ts
│   └── invoice-processing-boundary/
│       └── src/
│           ├── api-contract.ts
│           ├── workflow-contract.ts
│           ├── runtime/
│           │   ├── orpc-surface.ts
│           │   └── inngest-surface.ts
│           └── index.ts
├── plugins/
│   ├── api/invoice-processing-api/src/index.ts
│   └── workflows/invoice-processing-workflows/src/index.ts
├── rawr.hq.ts
└── apps/server/src/rawr.ts
```

## Code Illustrations
### 1) Domain package (domain schemas/types + internal contract)
```ts
// packages/invoice-processing-domain/src/types.ts
import { Type, type Static } from "typebox";

export const InvoiceIdSchema = Type.String({ minLength: 8, pattern: "^INV-" });
export const InvoiceStatusSchema = Type.Union([
  Type.Literal("queued"),
  Type.Literal("running"),
  Type.Literal("completed"),
  Type.Literal("failed"),
]);

export type InvoiceId = Static<typeof InvoiceIdSchema>;
export type InvoiceStatus = Static<typeof InvoiceStatusSchema>;

export type InvoiceAggregate = {
  invoiceId: InvoiceId;
  status: InvoiceStatus;
  riskScore?: number;
};
```

```ts
// packages/invoice-processing-domain/src/internal-contract.ts
import type { InvoiceAggregate, InvoiceId } from "./types";

export type StartInvoiceCommand = {
  invoiceId: InvoiceId;
  requestedByActorId: string;
  amountCents: number;
};

export type InvoiceDomainContract = {
  start: (cmd: StartInvoiceCommand) => Promise<{ runId: string; accepted: true }>;
  getStatus: (runId: string) => Promise<InvoiceAggregate | null>;
  markRunning: (runId: string) => Promise<void>;
  finalize: (runId: string, riskScore: number) => Promise<void>;
};
```

### 2) Boundary package API contract (inline IO shape)
```ts
// packages/invoice-processing-boundary/src/api-contract.ts
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { typeBoxStandardSchema } from "@rawr/core/orpc/typebox-standard-schema";
import { InvoiceIdSchema } from "@rawr/invoice-processing-domain";

const tag = ["invoice-processing"] as const;

export const invoiceApiContract = oc.router({
  start: oc
    .route({ method: "POST", path: "/invoice-processing/runs", tags: tag, operationId: "invoiceStart" })
    .input(
      typeBoxStandardSchema(
        Type.Object(
          {
            invoiceId: InvoiceIdSchema,
            requestedByActorId: Type.String({ minLength: 3 }),
            amountCents: Type.Integer({ minimum: 0 }),
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
    ),

  status: oc
    .route({ method: "GET", path: "/invoice-processing/runs/{runId}", tags: tag, operationId: "invoiceStatus" })
    .input(typeBoxStandardSchema(Type.Object({ runId: Type.String({ minLength: 1 }) }, { additionalProperties: false })))
    .output(
      typeBoxStandardSchema(
        Type.Object(
          {
            runId: Type.String({ minLength: 1 }),
            status: Type.Union([
              Type.Literal("queued"),
              Type.Literal("running"),
              Type.Literal("completed"),
              Type.Literal("failed"),
            ]),
            riskScore: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
          },
          { additionalProperties: false },
        ),
      ),
    ),
});
```

### 3) Boundary package workflow contract + runtime primitive
```ts
// packages/invoice-processing-boundary/src/workflow-contract.ts
import { Type } from "typebox";
import { InvoiceIdSchema } from "@rawr/invoice-processing-domain";

export const INVOICE_REQUESTED_EVENT = "invoice-processing.requested" as const;

export const InvoiceRequestedEventPayloadSchema = Type.Object(
  {
    runId: Type.String({ minLength: 1 }),
    invoiceId: InvoiceIdSchema,
    amountCents: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
);
```

```ts
// packages/invoice-processing-boundary/src/runtime/inngest-surface.ts
import type { Inngest } from "inngest";
import { Value } from "typebox/value";
import { INVOICE_REQUESTED_EVENT, InvoiceRequestedEventPayloadSchema } from "../workflow-contract";
import type { InvoiceDomainContract } from "@rawr/invoice-processing-domain";

export function createInvoiceWorkflowSurface(client: Inngest, domain: InvoiceDomainContract) {
  const fn = client.createFunction(
    { id: "invoice-processing.reconcile", retries: 2 },
    { event: INVOICE_REQUESTED_EVENT },
    async ({ event, step }) => {
      if (!Value.Check(InvoiceRequestedEventPayloadSchema, event.data)) {
        throw new Error("invalid invoice payload");
      }

      await step.run("mark-running", () => domain.markRunning(event.data.runId));
      await step.run("finalize", () => domain.finalize(event.data.runId, Math.min(1, event.data.amountCents / 150_000)));
      return { ok: true, runId: event.data.runId };
    },
  );

  return { functions: [fn] as const };
}
```

### 4) Plugins, composition, and host mounting flow
```ts
// plugins/api/invoice-processing-api/src/index.ts
import { createInvoiceOrpcSurface } from "@rawr/invoice-processing-boundary/runtime/orpc-surface";

export const registerInvoiceProcessingApiPlugin = createInvoiceOrpcSurface;
```

```ts
// rawr.hq.ts
import { Inngest } from "inngest";
import { oc } from "@orpc/contract";
import { createInvoiceDomainService } from "@rawr/invoice-processing-domain";
import { registerInvoiceProcessingApiPlugin } from "./plugins/api/invoice-processing-api/src";
import { registerInvoiceProcessingWorkflowPlugin } from "./plugins/workflows/invoice-processing-workflows/src";

const domain = createInvoiceDomainService(createInvoiceDomainDeps());
const inngest = new Inngest({ id: "rawr-hq" });

const api = registerInvoiceProcessingApiPlugin({ domain, inngestClient: inngest });
const workflows = registerInvoiceProcessingWorkflowPlugin({ client: inngest, domain });

export const rawrHqManifest = {
  orpc: { contract: oc.router({ invoice: api.contract }), router: { invoice: api.router }, context: {} },
  inngest: { client: inngest, functions: workflows.functions },
} as const;
```

```ts
// apps/server/src/rawr.ts
mountOrpcFromManifest(app, rawrHqManifest.orpc);
mountInngestFromManifest(app, rawrHqManifest.inngest);
```

## API + Workflow + Composition + Host Mount Flow
1. API boundary contract validates request and maps to domain internal command.
2. API boundary runtime primitive invokes domain internal contract and emits workflow event.
3. Workflow boundary runtime primitive consumes event, validates payload, and calls domain internal contract steps.
4. `rawr.hq.ts` composes API/workflow surfaces and shared deps once.
5. Host mounts manifest outputs only (`/rpc`, `/api/orpc`, `/api/inngest`).

## Shared Consumers and Drift Control
### Shared consumers (web/cli/tests)
- Web/CLI import API contract from boundary package for typed clients.
- Tests import boundary runtime primitives plus fake domain contract implementations for in-process checks.
- Domain tests stay focused on `*-domain` package and ignore transport concerns.

### Drift controls
1. Contract snapshots from boundary package (`api-contract.ts`) and OpenAPI snapshots from same source.
2. Event payload schema contract tests ensure producer/consumer compatibility.
3. Compile-time directional import rule: `*-domain` cannot import `*-boundary`.
4. Plugin rule: plugins may not define duplicate boundary contracts already exported by boundary packages.
5. No runtime plugin-to-plugin imports (existing policy remains).

## What Gets Simpler / What Gets Harder
| Dimension | Simpler | Harder |
| --- | --- | --- |
| Domain stability | Domain package stays clean and stable | Need strict package layering discipline |
| Boundary reuse | API/workflow glue authored once in boundary package | More packages per capability |
| Contract drift | Inline IO shape with contract reduces detached schema drift | Boundary package now carries runtime deps (`@orpc/server`, `inngest`) |
| Consumer experience | Web/CLI/tests import one boundary contract surface | Versioning between `*-domain` and `*-boundary` must be managed |
| Plugin complexity | Plugins become thin policy wrappers | Teams used to plugin-owned contracts must adapt |

## Migration Path from Today-State
### Phase 1: Extract domain core
- From `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts`, move core coordination business behavior into `packages/coordination-domain`.
- Keep `packages/core/src/orpc/hq-router.ts` stable during extraction.

### Phase 2: Create boundary package
- Add `packages/coordination-boundary` with:
  - API contract file (inline IO shapes),
  - workflow contract file,
  - runtime surface primitives.
- Maintain one-way imports into `packages/coordination-domain`.

### Phase 3: Thin plugins
- Introduce `plugins/api/*` and `plugins/workflows/*` wrappers that delegate to boundary runtime primitives.
- Keep no plugin-to-plugin imports.

### Phase 4: Compose + mount cleanup
- Compose in `rawr.hq.ts` only.
- Reduce `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts` and `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts` to mount/host concerns.

### Phase 5: Enforcement
- Add lint rules for import direction (`boundary -> domain`, never reverse).
- Add snapshot and schema-compat checks for boundary contracts/events.

## Why This Is Still a Strong Contrast to "Domain-Only Packages"
Because runtime-facing ownership moves into package-layer boundary modules (not app/plugin leafs), the package layer becomes the primary home for:
- contract semantics,
- runtime integration primitives,
- drift controls.

Domain purity is preserved where required, but the architecture avoids repeating boundary glue across plugins/apps.

## Counter-Review of Approach A
### Strongest objections to A
1. Purity claim and implementation pattern conflict.
- A states packages are pure domain/service modules: `SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:4`.
- But A's own A1 package example imports `implement` from `@orpc/server` inside `packages/invoice-processing/src/api/router.base.ts`: `SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:103-105`.
- This is runtime coupling in package space without an explicit boundary-package ownership model, so purity is asserted but not structurally enforced.

2. A1/A2 dual-track API model increases architectural branching and drift.
- A introduces two valid integration paths (`A1`, `A2`): `SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:96`, `SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:140`.
- In A2, plugin-local contract extension (`forceReconcile`) modifies contract surface in plugin layer: `SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:160-166`.
- Result: canonical API surface can fragment across plugins and makes web/cli/test consumer contract ownership less deterministic.

3. Event/intent drift risk is still present in A's flow.
- A domain emits string intent (`\"invoice.processing.requested\"`): `SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:201-213`.
- Workflow plugin separately subscribes to hardcoded event string: `SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:223`.
- Without explicit shared boundary contract ownership for event shapes/semantics, producer/consumer drift is easy.

4. A does not actually reduce ceremony versus the criticized baseline.
- A's tree adds domain/api/workflow/clients directories inside package plus plugins and `rawr.hq.ts`: `SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:57-71`.
- This can recreate the \"too many places to touch\" pressure that triggered the architecture debate.

### Where A is stronger than B
1. A's intent is clearer for teams that prioritize strict domain-core readability.
2. A strongly protects runtime semantics in plugins and keeps `rawr.hq.ts` as singular composition authority.
3. A2 provides a pragmatic escape hatch for policy-heavy API boundaries when strict standardization is not yet mature.

### Concrete flow comparison (A vs B)
1. A flow (from doc):
- Package API module materializes router (`router.base.ts`) -> API plugin re-exports it (A1) -> optional plugin-local contract divergence (A2) -> `rawr.hq.ts` compose.

2. B flow (this doc):
- Domain package exposes core contract + logic -> boundary package owns API/workflow contracts + runtime primitives -> plugins remain policy wrappers -> `rawr.hq.ts` compose.

3. Why B is more coherent:
- In B, runtime-capable package code is deliberate and named (`*-boundary/runtime/*`), not implicit under \"pure\" package claims.
- In B, ownership of shared boundary artifacts is explicit and easier to test/lint as a first-class layer.

### Recommendation impact
Recommendation does not change: keep Approach B as the stronger contrasting architecture.
However, I adopt two guardrails reinforced by A:
1. Keep domain package strictly stable and one-way imported by boundary packages.
2. Avoid dual path proliferation (A1/A2-style branching) by default; require explicit exception criteria for plugin-local contract extensions.
