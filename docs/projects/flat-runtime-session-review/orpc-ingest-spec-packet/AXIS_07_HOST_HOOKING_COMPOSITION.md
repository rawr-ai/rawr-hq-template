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
1. Use short descriptive names by role, not implementation trivia; prefer concise domain/plugin directory names when clear (for example `packages/invoicing`, `plugins/api/invoicing`, `plugins/workflows/invoicing`).
2. Canonical defaults: `contract.ts`, `router.ts`, `client.ts`, `operations/*`, `index.ts`.
3. Internal package layered defaults MAY include `domain/*`, `service/*`, `procedures/*`, `errors.ts`.
4. Within one `domain/` folder, filenames avoid redundant domain prefixes (`status.ts`, not `invoice-status.ts` for `invoicing/domain/`).
5. Domain schema modules are TypeBox-first and co-export static types from the same file.
6. Shared context contracts default to explicit `context.ts` modules (or equivalent dedicated context modules), consumed by router modules.
7. Keep role context in prose, not context-baked filename suffixes.
8. In docs, prefer `schema({...})` for object-root wrappers (`schema({...})` => `std(Type.Object({...}))`).
9. Keep `std(...)` (or `typeBoxStandardSchema(...)`) explicit for non-`Type.Object` roots.
10. Preferred helper names: `capability-composer.ts`, `surfaces.ts`, `with-internal-client.ts`.
11. Avoid ambiguous helper names that hide ownership or execution semantics.

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
  workflows/
    context.ts
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
  context.ts
  router.ts
  client.ts
  errors.ts
  index.ts
plugins/api/<domain>/src/contract.ts
  operations/*
  context.ts
  router.ts
  index.ts
plugins/workflows/<domain>/src/contract.ts
  operations/*
  context.ts
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
const inngest = createInngestClient("rawr-hq");
const capabilities = [
  createInvoicingCapabilitySurface(inngest),
  createSearchCapabilitySurface(inngest),
] as const;

export const rawrHqManifest = composeCapabilities(capabilities, inngest);
```

The manifest emits separate `orpc` and `workflows` namespaces so host wiring can mount `/rpc*` + `/api/orpc*` from `rawrHqManifest.orpc` while `/api/workflows/*` uses `rawrHqManifest.workflows` routes and the same `inngest` bundle. Plugin-generated capability metadata feeds the manifest so `apps/*` never needs manual edits; see `SESSION_019c587a_D005_HOSTING_COMPOSITION_COHESIVE_RECOMMENDATION.md` for the generator+helper story.

### Host fixture split mount contract
```ts
// apps/server/src/rawr.ts
app.all("/api/inngest", async ({ request }) => inngestHandler(request));
const workflowHandler = new OpenAPIHandler(rawrHqManifest.workflows.triggerRouter);

app.all("/api/workflows/*", async ({ request }) => {
  const context = createWorkflowBoundaryContext({
    principal: requirePrincipal(request),
    inngest: inngestBundle.client,
    runtime,
  });
  const result = await workflowHandler.handle(request, {
    prefix: "/api/workflows",
    context,
  });
  return result.matched ? result.response : new Response("not found", { status: 404 });
}, { parse: "none" });

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

### File-structure implications
The manifest-driven spine adds one new fixture: `apps/server/src/workflows/context.ts` (principal resolution, workflow boundary metadata, and runtime helpers) while keeping `apps/server/src/rawr.ts` focused on mounting `/api/workflows/*` and `/api/inngest`. Capability metadata stays inside `packages/*` and `plugins/*`, and `rawr.hq.ts` is generated under the repo root so host owners do not edit it manually.

### What changes vs what stays the same
- **Changes:** generate `rawr.hq.ts` from capability metadata, add workflow context fixtures, mount `OpenAPIHandler(rawrHqManifest.workflows.triggerRouter)` at `/api/workflows/*`, and pass the manifest’s `inngest` bundle into `createInngestServeHandler`. The capability namespace mapping is now explicit, and helper scripts (e.g., `composeCapabilities`, manifest generator) orchestrate wiring.
- **Unchanged:** `/rpc*` + `/api/orpc*` still go through `registerOrpcRoutes()`, the same `CoordinationRuntimeAdapter`/`createCoordinationInngestFunction()` pair supports durability, and `packages/core` still owns the `hqContract` neighborhood. The DECISIONS entry now predicates D-005 on the new policy rather than claiming runtime is done.

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
4. `apps/server/src/workflows/register-workflow-routes.ts`

These are optional DX helpers and do not alter semantic policy.

```ts
// capability-composer.ts
export function composeCapabilities<const T extends readonly Capability[]>(capabilities: T, inngestClient: unknown) {
  const orpcContract = oc.router(
    Object.fromEntries(
      capabilities.map((capability) => [
        capability.capabilityId,
        capability.api.contract,
      ]),
    ),
  );
  const orpcRouter = Object.fromEntries(
    capabilities.map((capability) => [
      capability.capabilityId,
      capability.api.router,
    ]),
  );
  const triggerContract = oc.router(
    Object.fromEntries(
      capabilities.map((capability) => [
        capability.capabilityId,
        capability.workflows.triggerContract,
      ]),
    ),
  );
  const triggerRouter = Object.fromEntries(
    capabilities.map((capability) => [
      capability.capabilityId,
      capability.workflows.triggerRouter,
    ]),
  );

  return {
    capabilities,
    orpc: { contract: orpcContract, router: orpcRouter },
    workflows: { triggerContract, triggerRouter },
    inngest: { client: inngestClient, functions: capabilities.flatMap((capability) => capability.workflows.functions) },
  } as const;
}
```

```ts
// register-workflow-routes.ts
export function registerWorkflowRoutes(app: Elysia, manifest: RawrHqManifest, deps: WorkflowRouteDeps) {
  const workflowHandler = new OpenAPIHandler(manifest.workflows.triggerRouter);
  app.all("/api/workflows/*", async ({ request }) => {
    const context = createWorkflowBoundaryContext({
      principal: requirePrincipal(request),
      inngest: deps.inngestClient,
      runtime: deps.runtime,
    });
    const result = await workflowHandler.handle(request, {
      prefix: "/api/workflows",
      context,
    });
    return result.matched ? result.response : new Response("not found", { status: 404 });
  }, { parse: "none" });
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
