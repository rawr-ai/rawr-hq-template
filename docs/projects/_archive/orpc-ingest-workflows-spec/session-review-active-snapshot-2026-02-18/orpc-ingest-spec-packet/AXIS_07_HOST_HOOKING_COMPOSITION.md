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
5. Host composition MUST consume plugin-owned boundary contracts/routers from the generated manifest; packages contribute shared logic/schema inputs, not boundary ownership.
6. Host MUST enforce caller-mode route boundaries: first-party callers (including MFEs by default) use `/rpc` via `RPCLink`, external callers use published OpenAPI surfaces (`/api/orpc/*`, `/api/workflows/<capability>/*`), and `/api/inngest` stays runtime-only signed ingress.
7. Host MUST NOT add a dedicated `/rpc/workflows` mount by default; first-party workflow RPC procedures compose under the existing `/rpc` surface.
8. Host composition docs/snippets MUST keep mount ownership explicit; do not hide wiring behind black-box composition narratives.
9. Host bootstrap MUST initialize baseline `extendedTracesMiddleware()` before constructing the Inngest client, composing workflow functions, or registering routes.
10. Host mount/control-plane order MUST be explicit: `/api/inngest` first, `/api/workflows/*` second, then `/rpc` and `/api/orpc/*`.
11. Plugin middleware MAY add runtime context/instrumentation but MUST inherit baseline traces middleware and MUST NOT replace or reorder that baseline.

## Route Family Purpose Table
| Route family | Primary caller class | Link/transport | Publication boundary | Auth expectation | Forbidden usage |
| --- | --- | --- | --- | --- | --- |
| `/rpc` | First-party internal callers (MFE default, internal services, CLI) | `RPCLink` | Internal-only, never externally published | first-party boundary session or trusted service context | external third-party callers, runtime ingress traffic |
| `/api/orpc/*` | External and exception first-party OpenAPI consumers | `OpenAPILink` | Externally published | boundary auth/session/token semantics | runtime ingress traffic |
| `/api/workflows/<capability>/*` | External and exception first-party workflow boundary consumers | `OpenAPILink` | Externally published | boundary auth/session/token semantics | runtime ingress traffic |
| `/api/inngest` | Inngest runtime only | Inngest serve callback | Runtime-only | signed ingress verification + gateway allow-listing | browser/API caller traffic |

## Host Route/Auth Enforcement Matrix
| Caller mode | Allowed routes | Default link type | Auth mode | Forbidden routes |
| --- | --- | --- | --- | --- |
| First-party MFE/internal caller | `/rpc` | `RPCLink` | boundary session or trusted service context | `/api/inngest` |
| External/third-party caller | `/api/orpc/*`, `/api/workflows/<capability>/*` | `OpenAPILink` | boundary auth/session/token | `/rpc`, `/api/inngest` |
| Runtime ingress | `/api/inngest` | Inngest callback transport | signed ingress verification | `/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*` |

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
1. `apps/server/src/orpc.ts`
   - Builds router from `hqContract`, injects `RawrOrpcContext`, mounts `/rpc*` and `/api/orpc*`, generates OpenAPI with TypeBox converter.
2. `apps/server/src/rawr.ts`
   - Initializes baseline traces first, creates runtime adapter + Inngest bundle, mounts `/api/inngest` and `/api/workflows/*`, then registers `/rpc` and `/api/orpc/*`.
3. `packages/core/src/orpc/hq-router.ts`
   - Aggregate contract root (`hqContract`) for composed API namespaces.
4. `packages/coordination-inngest/src/adapter.ts`
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
plugins/web/<domain>/src/
  client.ts
  components/*
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
initializeExtendedTracesBaseline();
const inngest = createInngestClient("rawr-hq");
const capabilities = [
  createInvoicingCapabilitySurface(inngest),
  createSearchCapabilitySurface(inngest),
] as const;

export const rawrHqManifest = composeCapabilities(capabilities, inngest);
```

The manifest emits separate `orpc` and `workflows` namespaces so host wiring can mount `/rpc*` + `/api/orpc*` from `rawrHqManifest.orpc` while `/api/workflows/*` uses `rawrHqManifest.workflows.triggerRouter` plus workflow-boundary context helpers and the same `inngest` bundle. `/rpc` remains first-party/internal transport only, and there is no separate `/rpc/workflows` mount by default. Plugin-generated capability metadata feeds the manifest so `apps/*` does not require manual capability route edits, while mount ownership remains explicit in packet composition docs.
Host bootstrap order is explicit and stable: initialize baseline traces first, create the single runtime-owned Inngest bundle, mount `/api/inngest`, mount `/api/workflows/*`, then register `/rpc` and `/api/orpc/*`.

### Host fixture split mount contract
```ts
// apps/server/src/rawr.ts
initializeExtendedTracesBaseline();
const inngestBundle = createCoordinationInngestFunction({ runtime });
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

### First-party vs external link setup
```ts
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { OpenAPILink } from "@orpc/openapi-client/fetch";

// First-party/internal (default, including MFEs by default)
const firstPartyClient = createORPCClient(capabilityClients.invoicing.workflows, {
  link: new RPCLink({ url: `${baseUrl}/rpc` }),
});

// External or explicit OpenAPI exception
const publishedClient = createORPCClient(externalContracts.invoicing.workflows, {
  link: new OpenAPILink({ url: `${baseUrl}/api/workflows` }),
});
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
- **Changes:** Host bootstrap now initializes baseline traces first, keeps a single runtime-owned Inngest bundle, mounts `/api/inngest` then `/api/workflows/*`, and only then registers `/rpc` + `/api/orpc/*`. Generated manifest wiring and helper composition remain explicit.
- **Unchanged:** D-005 route split semantics, D-006 plugin boundary ownership, and D-007 caller transport/publication boundaries are unchanged. `/rpc*` + `/api/orpc*` still go through `registerOrpcRoutes()`, and the same `CoordinationRuntimeAdapter`/`createCoordinationInngestFunction()` pairing still supports durability.

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
- Local: `apps/server/src/rawr.ts:105`
- Local: `apps/server/src/rawr.ts:111`
- Local: `apps/server/src/rawr.ts:113`
- Local: `apps/server/src/orpc.ts:339`

## Cross-Axis Links
- External generation surface policy: [AXIS_01_EXTERNAL_CLIENT_GENERATION.md](./AXIS_01_EXTERNAL_CLIENT_GENERATION.md)
- Context envelope ownership: [AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md](./AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md)
- Workflow/API boundary ownership: [AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md](./AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md)
- Micro-frontend mount integration: [E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md](./examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md)
