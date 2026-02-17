# Axis 07: Host Hooking and Composition

## In Scope
- Host mount boundaries and composition spine.
- Runtime/host glue inventory and ownership.
- Required root fixtures and optional composition helpers.
- Canonical naming defaults used across composition-critical files.

## Out of Scope
- External client generation policy details (see [AXIS_01_EXTERNAL_CLIENT_GENERATION.md](./AXIS_01_EXTERNAL_CLIENT_GENERATION.md)).
- Workflow trigger boundary semantics (see [AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md](./AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md)).

## Canonical Policy
1. Host MUST mount oRPC endpoints and Inngest ingress as separate explicit mounts.
2. Host MUST own Inngest client/function bundle composition and pass client into oRPC context where enqueue bridge is needed.
3. Host SHOULD keep parse-safe forwarding semantics for oRPC handler mounts.
4. Host MUST keep one runtime-owned Inngest client bundle per process.

## Why
- Explicit host wiring prevents hidden coupling.
- Mount boundaries are the clearest expression of harness ownership.

## Trade-Offs
- Host has explicit multi-mount configuration.
- This is desired for clarity and operational control.

## Naming Rules (Canonical)
1. Use short descriptive names by role, not implementation trivia; prefer concise domain/plugin directory names when clear (`invoicing`, `invoicing-api`, `invoicing-workflows`).
2. Canonical defaults: `contract.ts`, `router.ts`, `client.ts`, `operations/*`, `index.ts`.
3. Internal package layered defaults MAY include `domain/*`, `service/*`, `procedures/*`, `errors.ts`.
4. Within one `domain/` folder, filenames avoid redundant domain prefixes (`status.ts`, not `invoice-status.ts` for `invoicing/domain/`).
5. Domain schema modules are TypeBox-first and co-export static types from the same file.
6. Keep role context in prose, not context-baked filename suffixes.
7. Preferred helper names: `capability-composer.ts`, `surfaces.ts`, `with-internal-client.ts`.
8. Avoid ambiguous helper names that hide ownership or execution semantics.

## Canonical Runtime/Host Inventory
1. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts`
   - Builds router from `hqContract`, injects `RawrOrpcContext`, mounts `/rpc*` and `/api/orpc*`, generates OpenAPI with TypeBox converter.
2. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts`
   - Creates runtime adapter + Inngest bundle, mounts `/api/inngest`, registers oRPC routes.
3. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts`
   - Aggregate contract root (`hqContract`) for composed API namespaces.
4. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts`
   - Inngest serve handler factory, run queue bridge, durable function definition, lifecycle timeline events.

## Canonical File Tree (Composition-Critical)
```text
apps/server/src/
  rawr.ts
  orpc.ts
rawr.hq.ts
packages/core/src/orpc/
  hq-router.ts
packages/orpc-standards/src/
  index.ts
  typebox-standard-schema.ts
packages/coordination-inngest/src/
  adapter.ts
packages/<domain>/src/
  domain/*
  service/*
  procedures/*
  router.ts
  client.ts
  errors.ts
  index.ts
plugins/api/<domain>-api/src/
  contract.ts
  operations/*
  router.ts
  index.ts
plugins/workflows/<domain>-workflows/src/
  contract.ts
  operations/*
  router.ts
  functions/*
  durable/*
  index.ts
```

## Required Root Fixtures (Brief, Concrete)

### TypeBox standard-schema adapter package
```ts
// packages/orpc-standards/src/index.ts
export { typeBoxStandardSchema } from "./typebox-standard-schema";
```

```ts
// packages/orpc-standards/src/typebox-standard-schema.ts
function parseIssuePath(instancePath: unknown): PropertyKey[] | undefined {
  if (typeof instancePath !== "string" || instancePath === "" || instancePath === "/") return undefined;
  return instancePath.split("/").slice(1).map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment));
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
          return path ? ({ message: issue.message, path } satisfies SchemaIssue) : ({ message: issue.message } satisfies SchemaIssue);
        });
        return { issues: issues.length > 0 ? issues : [{ message: "Validation failed" }] };
      },
    },
    __typebox: schema,
  } as Schema<Static<T>, Static<T>>;
}
```

### Composition root fixture (`rawr.hq.ts`)
```ts
const inngest = new Inngest({ id: "rawr-hq" });
const invoiceWorkflows = createInvoiceWorkflowSurface(inngest);

export const rawrHqManifest = {
  orpc: {
    contract: oc.router({
      invoicing: {
        api: invoiceApiSurface.contract,
        workflows: invoiceWorkflows.triggerContract,
      },
    }),
    router: {
      invoicing: {
        api: invoiceApiSurface.router,
        workflows: invoiceWorkflows.triggerRouter,
      },
    },
  },
  inngest: { client: inngest, functions: [...invoiceWorkflows.functions] },
} as const;
```

### Host fixture split mount contract
```ts
// apps/server/src/rawr.ts
app.all("/api/inngest", async ({ request }) => inngestHandler(request));

registerOrpcRoutes(app, {
  repoRoot: opts.repoRoot,
  baseUrl: opts.baseUrl ?? "http://localhost:3000",
  runtime,
  inngestClient: inngestBundle.client,
});
```

## Canonical Harness Snippets

### oRPC router + OpenAPI mount
```ts
const rpcHandler = new RPCHandler<RawrOrpcContext>(router);
const openapiHandler = new OpenAPIHandler<RawrOrpcContext>(router);

app.all("/rpc/*", async (ctx) =>
  (await rpcHandler.handle(ctx.request as Request, {
    prefix: "/rpc",
    context: options,
  })).response,
{ parse: "none" });
```

### Inngest serve handler mount
```ts
const inngestBundle = createCoordinationInngestFunction({ runtime });
const inngestHandler = createInngestServeHandler({
  client: inngestBundle.client,
  functions: inngestBundle.functions,
});

app.all("/api/inngest", async ({ request }) => inngestHandler(request));
```

## Glue Boundaries and Ownership
1. Host app owns mount boundaries and runtime wiring.
2. oRPC layer owns boundary contract exposure and request context.
3. Workflow trigger routers own enqueue semantics.
4. Inngest functions own durable step execution semantics.
5. Domain packages own reusable capability logic and internal client contract.

## Optional Composition Helpers (Explicit, Non-Black-Box)
1. `packages/core/src/composition/capability-composer.ts`
2. `packages/core/src/composition/surfaces.ts`
3. `packages/core/src/orpc/with-internal-client.ts`

These are optional DX helpers and do not alter semantic policy.

```ts
// capability-composer.ts
export function composeCapabilities<const T extends readonly Capability[]>(capabilities: T, inngestClient: unknown) {
  const contract = oc.router(
    Object.fromEntries(
      capabilities.map((capability) => [
        capability.capabilityId,
        { api: capability.api.contract, workflows: capability.workflows.triggerContract },
      ]),
    ),
  );
  const router = Object.fromEntries(
    capabilities.map((capability) => [
      capability.capabilityId,
      { api: capability.api.router, workflows: capability.workflows.triggerRouter },
    ]),
  );
  return {
    capabilities,
    orpc: { contract, router },
    inngest: { client: inngestClient, functions: capabilities.flatMap((capability) => capability.workflows.functions) },
  } as const;
}
```

```ts
// surfaces.ts
export type ApiSurface<TContract, TRouter> = { contract: TContract; router: TRouter };
export type WorkflowSurface<TContract, TRouter, TFunctions extends readonly unknown[]> = {
  triggerContract: TContract;
  triggerRouter: TRouter;
  functions: TFunctions;
};
```

```ts
// with-internal-client.ts
export function withInternalClient<TContext, TClient>(getClient: (context: TContext) => TClient) {
  return async <TInput, TOutput>(
    args: { context: TContext; input: TInput },
    run: (client: TClient, input: TInput) => Promise<TOutput>,
  ): Promise<TOutput> => {
    const client = getClient(args.context);
    return run(client, args.input);
  };
}
```

## References
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:105`
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:111`
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:113`
- Local: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:339`

## Cross-Axis Links
- External generation surface policy: [AXIS_01_EXTERNAL_CLIENT_GENERATION.md](./AXIS_01_EXTERNAL_CLIENT_GENERATION.md)
- Context envelope ownership: [AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md](./AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md)
- Workflow/API boundary ownership: [AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md](./AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md)
