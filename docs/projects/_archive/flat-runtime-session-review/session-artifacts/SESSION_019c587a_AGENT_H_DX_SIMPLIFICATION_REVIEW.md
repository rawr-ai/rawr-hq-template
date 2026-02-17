# SESSION_019c587a — Agent H DX Simplification Review

Assumed repo root for all repo-relative paths in this document:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal`

## 1) Executive Judgment

Current canonical direction is strong on boundary clarity, but still over-wired in composition ergonomics.

Over-wired areas:
- Central composition repeats capability shape and merge mapping in several places (`api`, `workflows`, contract map, router map, functions list), which scales poorly as capability count grows: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:119`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:203`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:748`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:763`.
- Capability-local context assembly is currently shown in `rawr.hq.ts`, which will bloat the composition spine over time: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:729`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:740`.
- API/workflow examples create internal clients repeatedly per handler/step: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:519`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:527`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:680`.

Acceptable and should stay:
- Keep strict split between caller-triggered workflow API and Inngest execution ingress: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:42`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:43`.
- Keep TypeBox adapter metadata + host OpenAPI converter model, which matches real host behavior: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:231`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:283`.

## 2) Duplication / Manual-Wiring Map

| Pattern | Where Found | Why Costly at Scale |
| --- | --- | --- |
| Capability shape restated repeatedly | Canonical doc policy + scaled rule + composition example: `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:119`, `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:203`, `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:748` | Every capability add/update requires multi-point edits with drift risk.
| Contract and router namespaces mapped twice | Composition example maps both trees manually: `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:748`, `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:755`; runtime code mirrors tree manually: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:107` | Same hierarchy duplicated, making contract/router mismatch likely.
| Context assembly in central composition | Inline `invoicePackageContext` in composition example: `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:729` | Turns composition into dependency-assembly layer; merge-conflict and coupling risk.
| TypeBox adapter duplicated | `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination/src/orpc/schemas.ts:268` and `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/state/src/orpc/contract.ts:41` | Validation semantics can drift by package.
| Per-handler internal client creation | `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:519`, `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:527`, `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:680` | Boilerplate obscures intent and encourages inconsistent patterns.

## 3) Simplification Proposals (Prioritized, Fully Wired)

### Proposal 1: Single capability composer for contract/router/functions

Proposed abstraction:
- `defineCapability(...)` + `composeCapabilities(...)` that derives `orpc.contract`, `orpc.router`, and `inngest.functions` from one list.

Implementation snippet:
```ts
// packages/core/src/composition/capability-composer.ts
import { oc } from "@orpc/contract";

export type CapabilityDescriptor = {
  capabilityId: string;
  api: {
    contract: Record<string, unknown>;
    router: Record<string, unknown>;
  };
  workflows: {
    triggerContract: Record<string, unknown>;
    triggerRouter: Record<string, unknown>;
    functions: readonly unknown[];
  };
};

export function defineCapability<const T extends CapabilityDescriptor>(capability: T): T {
  return capability;
}

export function composeCapabilities<const T extends readonly CapabilityDescriptor[]>(
  capabilities: T,
  inngestClient: unknown,
) {
  const contractNamespaces = Object.fromEntries(
    capabilities.map((capability) => [
      capability.capabilityId,
      {
        api: capability.api.contract,
        workflows: capability.workflows.triggerContract,
      },
    ]),
  );

  const routerNamespaces = Object.fromEntries(
    capabilities.map((capability) => [
      capability.capabilityId,
      {
        api: capability.api.router,
        workflows: capability.workflows.triggerRouter,
      },
    ]),
  );

  return {
    capabilities,
    orpc: {
      contract: oc.router(contractNamespaces),
      router: routerNamespaces,
    },
    inngest: {
      client: inngestClient,
      functions: capabilities.flatMap((capability) => [...capability.workflows.functions]),
    },
  } as const;
}
```

Exact location:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/packages/core/src/composition/capability-composer.ts`

End-to-end wiring:
- Import in composition root (`rawr.hq.ts`):
```ts
import { defineCapability, composeCapabilities } from "@rawr/core/composition/capability-composer";
```
- Invoke in `rawr.hq.ts`:
```ts
const invoiceCapability = defineCapability({
  capabilityId: "invoicing",
  api: invoiceApiSurface,
  workflows: invoiceWorkflowSurface,
});

export const rawrHqManifest = composeCapabilities([invoiceCapability], inngest);
```
- Replaces old manual wiring:
  - Removes handwritten `orpc.contract` namespace object (`...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:748`).
  - Removes handwritten `orpc.router` namespace object (`...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:755`).
  - Removes standalone `capabilities.flatMap(...)` wiring (`...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:763`).
- Composition/manifest/host change:
  - Manifest output shape remains `{ orpc, inngest }`, so host usage at route registration stays unchanged (`registerOrpcRoutes`, `registerInngestRoute` pattern remains).

DX gain:
- One capability registration step instead of three aggregate edits.

Risks/trade-offs:
- Slightly less “inline explicit” in `rawr.hq.ts`; requires trusting helper output.

Keep-as-is alternative if rejected:
- Keep manual merge blocks but enforce a structural parity check for contract/router/function namespaces.

### Proposal 2: Typed surface builders for API/workflow exports

Proposed abstraction:
- `defineApiSurface(...)` and `defineWorkflowSurface(...)` to make surface shape checked once and reused everywhere.

Implementation snippet:
```ts
// packages/core/src/composition/surfaces.ts
export type ApiSurface<TContract, TRouter> = {
  contract: TContract;
  router: TRouter;
};

export function defineApiSurface<const TContract, const TRouter>(surface: ApiSurface<TContract, TRouter>) {
  return surface;
}

export type WorkflowSurface<TTriggerContract, TTriggerRouter, TFunctions extends readonly unknown[]> = {
  triggerContract: TTriggerContract;
  triggerRouter: TTriggerRouter;
  functions: TFunctions;
};

export function defineWorkflowSurface<
  const TTriggerContract,
  const TTriggerRouter,
  const TFunctions extends readonly unknown[],
>(surface: WorkflowSurface<TTriggerContract, TTriggerRouter, TFunctions>) {
  return surface;
}
```

Exact location:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/packages/core/src/composition/surfaces.ts`

End-to-end wiring:
- Import in API plugin composition export:
```ts
import { defineApiSurface } from "@rawr/core/composition/surfaces";
```
- API plugin usage:
```ts
// plugins/api/invoice-processing-api/src/index.ts
export const invoiceApiSurface = defineApiSurface({
  contract: invoiceApiContract,
  router: createInvoiceApiRouter(),
});
```
- Import in workflow plugin composition export:
```ts
import { defineWorkflowSurface } from "@rawr/core/composition/surfaces";
```
- Workflow plugin usage:
```ts
// plugins/workflows/invoice-processing-workflows/src/index.ts
export function createInvoiceWorkflowSurface(inngest: Inngest, packageContext: InvoicePackageContext) {
  return defineWorkflowSurface({
    triggerContract: invoiceWorkflowTriggerContract,
    triggerRouter: createInvoiceWorkflowTriggerRouter(),
    functions: createInvoiceWorkflowFunctions(inngest, packageContext),
  });
}
```
- Replaces old manual wiring:
  - Replaces raw object literal API surface declaration (`...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:539`).
  - Replaces raw object literal workflow surface declaration (`...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:707`).
- Composition/manifest/host change:
  - `composeCapabilities(...)` consumes the same keys but now surfaces are structurally validated at creation.

DX gain:
- Surface contracts are consistent by construction, not convention.

Risks/trade-offs:
- Adds small helper API that must stay stable.

Keep-as-is alternative if rejected:
- Keep object literals but require `satisfies`-based shape checks in every plugin `index.ts`.

### Proposal 3: Capability-owned context factory boundary

Proposed abstraction:
- Move capability dependency assembly out of `rawr.hq.ts` into package-owned context factory.

Implementation snippet:
```ts
// packages/invoice-processing/src/context.ts
import type { InvoiceLifecycleDeps } from "./services/invoice-lifecycle.service";
import type { InvoicePackageContext } from "./router";

export type InvoiceCapabilityEnv = {
  newRunId: () => string;
  saveRun: InvoiceLifecycleDeps["saveRun"];
  getRun: InvoiceLifecycleDeps["getRun"];
};

export function createInvoiceCapabilityContext(env: InvoiceCapabilityEnv): InvoicePackageContext {
  return {
    deps: {
      newRunId: env.newRunId,
      saveRun: env.saveRun,
      getRun: env.getRun,
    },
  };
}
```

Exact location:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/packages/invoice-processing/src/context.ts`

End-to-end wiring:
- Import in `rawr.hq.ts`:
```ts
import { createInvoiceCapabilityContext } from "@rawr/invoice-processing/context";
```
- Invocation in `rawr.hq.ts`:
```ts
const invoicePackageContext = createInvoiceCapabilityContext({
  newRunId: () => crypto.randomUUID(),
  saveRun: async () => {},
  getRun: async () => null,
});

const invoiceWorkflowSurface = createInvoiceWorkflowSurface(inngest, invoicePackageContext);
```
- Replaces old manual wiring:
  - Replaces inline `invoicePackageContext` object assembly in composition (`...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:729`).
- Composition/manifest/host change:
  - Composition file remains wiring-only; host mount behavior does not change.

DX gain:
- Capability setup logic becomes capability-local, reducing central composition churn.

Risks/trade-offs:
- One extra package export to manage.

Keep-as-is alternative if rejected:
- Keep inline context declaration but move each capability context into separate local module imported by `rawr.hq.ts`.

### Proposal 4: Shared TypeBox adapter and shared OpenAPI converter

Proposed abstraction:
- One shared TypeBox Standard Schema adapter and one shared OpenAPI converter export, used by all contracts and host generator.

Implementation snippet:
```ts
// packages/orpc-standards/src/typebox-standard-schema.ts
import type { Schema, SchemaIssue } from "@orpc/contract";
import { type Static, type TSchema } from "typebox";
import { Value } from "typebox/value";

function parseIssuePath(instancePath: unknown): PropertyKey[] | undefined {
  if (typeof instancePath !== "string") return undefined;
  if (instancePath === "" || instancePath === "/") return undefined;
  const segments = instancePath
    .split("/")
    .slice(1)
    .map((segment) => decodeURIComponent(segment.replace(/~1/g, "/").replace(/~0/g, "~")))
    .map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment));
  return segments.length > 0 ? segments : undefined;
}

export function typeBoxStandardSchema<T extends TSchema>(schema: T): Schema<Static<T>, Static<T>> {
  return {
    "~standard": {
      version: 1,
      vendor: "typebox",
      validate: (value) => {
        if (Value.Check(schema, value)) return { value: value as Static<T> };

        const issues = [...Value.Errors(schema, value)].map((issue) => {
          const path = parseIssuePath((issue as { instancePath?: unknown }).instancePath);
          return path
            ? ({ message: issue.message, path } satisfies SchemaIssue)
            : ({ message: issue.message } satisfies SchemaIssue);
        });

        return { issues: issues.length > 0 ? issues : [{ message: "Validation failed" }] };
      },
    },
    __typebox: schema,
  } as Schema<Static<T>, Static<T>>;
}
```

```ts
// packages/orpc-standards/src/openapi-typebox-converter.ts
import type { ConditionalSchemaConverter, JSONSchema } from "@orpc/openapi";

export const typeBoxOpenApiSchemaConverter: ConditionalSchemaConverter = {
  condition: (schema) => Boolean(schema && typeof schema === "object" && "__typebox" in schema),
  convert: (schema) => {
    const rawSchema = (schema as { __typebox?: unknown }).__typebox;
    if (!rawSchema || typeof rawSchema !== "object") return [false, {}];
    return [true, JSON.parse(JSON.stringify(rawSchema)) as JSONSchema];
  },
};
```

```ts
// packages/orpc-standards/src/index.ts
export { typeBoxStandardSchema } from "./typebox-standard-schema";
export { typeBoxOpenApiSchemaConverter } from "./openapi-typebox-converter";
```

Exact location:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/packages/orpc-standards/src/typebox-standard-schema.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/packages/orpc-standards/src/openapi-typebox-converter.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/packages/orpc-standards/src/index.ts`

End-to-end wiring:
- Contract imports:
```ts
import { typeBoxStandardSchema } from "@rawr/orpc-standards";
```
- Host OpenAPI generator import:
```ts
import { typeBoxOpenApiSchemaConverter } from "@rawr/orpc-standards";
```
- Host generator usage:
```ts
const generator = new OpenAPIGenerator({
  schemaConverters: [typeBoxOpenApiSchemaConverter],
});
```
- Replaces old manual wiring:
  - Replaces local adapter definitions in coordination and state (`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination/src/orpc/schemas.ts:268`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/state/src/orpc/contract.ts:41`).
  - Replaces local OpenAPI converter block in host (`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:283`).
- Composition/manifest/host change:
  - No manifest shape change; host consumes shared converter import instead of local converter definition.

DX gain:
- One canonical adapter/converter source eliminates behavior drift.

Risks/trade-offs:
- Shared package becomes foundational.

Keep-as-is alternative if rejected:
- Keep local copies but enforce strict parity tests across all adapter/converter copies.

### Proposal 5: Router-level internal-client binder

Proposed abstraction:
- A reusable helper to create internal client once per handler invocation pattern and reduce duplicated client setup code.

Implementation snippet:
```ts
// packages/core/src/orpc/with-internal-client.ts
type HandlerArgs<TContext, TInput> = {
  context: TContext;
  input: TInput;
};

export function withInternalClient<TContext, TClient>(createClient: (context: TContext) => TClient) {
  return function <TInput, TOutput>(
    handler: (client: TClient, args: HandlerArgs<TContext, TInput>) => Promise<TOutput> | TOutput,
  ) {
    return async (args: HandlerArgs<TContext, TInput>): Promise<TOutput> => {
      const client = createClient(args.context);
      return handler(client, args);
    };
  };
}
```

Exact location:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/packages/core/src/orpc/with-internal-client.ts`

End-to-end wiring:
- Import in API router:
```ts
import { withInternalClient } from "@rawr/core/orpc/with-internal-client";
```
- API router invocation:
```ts
const withInvoiceInternal = withInternalClient<
  InvoiceApiContext,
  ReturnType<typeof createInvoiceInternalClient>
>(createInvoiceInternalClient);

return os.router({
  startInvoiceProcessing: os.startInvoiceProcessing.handler(
    withInvoiceInternal(async (internal, { input }) =>
      internal.start({ invoiceId: input.invoiceId, requestedBy: input.requestedBy }),
    ),
  ),
  getInvoiceProcessingStatus: os.getInvoiceProcessingStatus.handler(
    withInvoiceInternal(async (internal, { input }) => internal.getStatus({ runId: input.runId })),
  ),
});
```
- Workflow invocation change (same goal, no extra hidden helper):
```ts
// plugins/workflows/invoice-processing-workflows/src/functions/index.ts
const internal = createInvoiceInternalClient(packageContext);

const reconcile = inngest.createFunction(
  { id: "invoice.reconciliation", retries: 2 },
  { event: "invoice.reconciliation.requested" },
  async ({ event, step }) => {
    await step.run("invoice/reconcile", async () => internal.getStatus({ runId: event.data.runId }));
    // ...
  },
);
```
- Replaces old manual wiring:
  - Replaces repeated per-handler `createInvoiceInternalClient(context)` calls (`...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:519`, `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:527`).
  - Replaces repeated per-step client construction (`...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:680`).
- Composition/manifest/host change:
  - No manifest or host changes; this is purely router/function authoring simplification.

DX gain:
- Handler bodies focus on domain mapping and policy, not repetitive plumbing.

Risks/trade-offs:
- If used incorrectly, helper can hide when client allocation happens.

Keep-as-is alternative if rejected:
- Keep direct calls but enforce a local `getInternal(context)` utility per router file to avoid duplicated inline creation.

## 4) Proposed Canonical Authoring Model (Minimal Standardized Workflow)

1. Define shared infra helpers in core/orpc standards.
- `packages/core/src/composition/capability-composer.ts`
- `packages/core/src/composition/surfaces.ts`
- `packages/core/src/orpc/with-internal-client.ts`
- `packages/orpc-standards/src/{typebox-standard-schema.ts,openapi-typebox-converter.ts,index.ts}`
2. In each capability package, define domain internals and a context factory.
- `packages/<capability>/src/{contract.ts,router.ts,client.ts,context.ts}`
3. In API and workflow plugins, export typed surfaces via `defineApiSurface(...)` / `defineWorkflowSurface(...)`.
4. In `rawr.hq.ts`, create capability descriptors via `defineCapability(...)` and aggregate once via `composeCapabilities(...)`.
5. Keep host mounting unchanged (`registerOrpcRoutes` + `registerInngestRoute`) consuming composed manifest shape.

Minimal authoring checklist for adding a new capability:
1. Add package context factory.
2. Add API/workflow surfaces with typed surface helpers.
3. Register one descriptor in `rawr.hq.ts`.
4. No manual edits to contract/router/functions aggregate blocks.

## 5) Do Now vs Later

Do now:
- Proposal 4 first, because real code currently duplicates TypeBox adapter logic across packages.
- Proposal 1 second, because it removes highest-risk recurring composition boilerplate.
- Proposal 2 third, because it stabilizes surface shape before capability count increases.

Do later:
- Proposal 3 when at least 2-3 capabilities have non-trivial dependency setup.
- Proposal 5 opportunistically when touching routers/workflow function files.

## 6) Keep Unchanged (Explicit)

- Keep `/api/workflows/*` vs `/api/inngest` split unchanged.
- Keep Path B default and Path A strict exception policy.
- Keep TypeBox `__typebox` metadata + OpenAPI converter strategy.
- Keep host mounting split (`registerOrpcRoutes` and `registerInngestRoute`) and avoid collapsing them into one mixed boundary.
