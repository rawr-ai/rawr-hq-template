# SESSION_019c587a Agent C D-006 Cohesive Architecture Synthesis

## Problem Statement
D-006 and D-007 stayed ambiguous because we mixed two different ownership models in one story: package-level reuse and plugin-level boundary exposure. The result was confusion about where workflow boundary contracts live, which client micro-frontends should use, and how auth semantics differ for browser callers versus trusted server callers. That ambiguity can leak into import rules and create accidental boundary collapse (especially around `/api/inngest`).

## What Is Solved
This correction locks a consistent two-layer model:
1. **Plugin-owned boundary contracts (D-006).** API/workflow boundary contracts are owned in plugins (`plugins/api/*/contract.ts`, `plugins/workflows/*/contract.ts`). Packages supply shared domain logic and domain schemas, but they do not own caller-facing boundary contracts or workflow trigger/status I/O schemas.
2. **Composed boundary clients for network callers (D-007).** Micro-frontends and other network callers use composed clients from manifest-composed boundary contracts and call `/api/workflows/<capability>/*` and `/api/orpc/*`. They never call `/api/inngest`.
3. **Internal server callers use in-process internal clients.** Server-side internal paths can use `packages/<capability>/src/client.ts` with trusted context and no local HTTP self-calls.

This keeps D-005 intact: `/api/workflows/*` is caller-facing; `/api/inngest` remains runtime-only ingress.

## Ownership and Composition Model
```text
packages/invoicing/src/
  domain/
  service/
  procedures/
  context.ts
  client.ts                     # server-only internal client
  browser.ts                    # browser-safe helper exports only

plugins/api/invoicing/src/
  contract.ts                   # plugin-owned boundary API contract
  operations/*
  router.ts

plugins/workflows/invoicing/src/
  contract.ts                   # plugin-owned workflow boundary contract
  operations/*
  router.ts
  functions/reconciliation.ts   # durable function runtime path

packages/core/src/composition/
  manifest-generator.ts         # composes plugin boundary contracts/routers

rawr.hq.ts                      # generated manifest authority

apps/server/src/
  rawr.ts                       # mounts /rpc*, /api/orpc*, /api/workflows/*, /api/inngest
  workflows/context.ts          # boundary auth/context for workflow API routes
```

### Contract and schema split (illustrative)
```ts
// plugins/workflows/invoicing/src/contract.ts
import { oc } from "@orpc/contract";
import { std } from "@rawr/orpc-standards";
import { Type } from "typebox";

export const invoicingWorkflowContract = oc.router({
  triggerReconciliation: oc
    .route({ method: "POST", path: "/invoicing/reconciliation/trigger" })
    .input(
      std(
        Type.Object({
          invoiceId: Type.String({ minLength: 1 }),
          requestedBy: Type.String({ minLength: 1 }),
        }),
      ),
    )
    .output(
      std(
        Type.Object({
          accepted: Type.Literal(true),
          runId: Type.String({ minLength: 1 }),
        }),
      ),
    ),
});
```

## Micro-Frontend Run Path (No Black Box)
This is the explicit path for one regular endpoint call, one workflow call, plus one browser-safe helper usage.

### Composition creates the capability-composed client
```ts
// packages/core/src/composition/manifest-generator.ts
export const rawrHqManifest = composeCapabilities({
  api: [invoicingApiSurface],
  workflows: [invoicingWorkflowSurface],
  inngest: inngestBundle,
});

export const capabilityClients = {
  invoicing: {
    api: rawrHqManifest.orpc.contract.invoicing,
    workflows: rawrHqManifest.workflows.triggerContract.invoicing,
  },
} as const;
```

### Browser-safe package helper + composed boundary clients
```ts
// packages/invoicing/src/browser.ts
export function toRunBadge(status: "queued" | "running" | "completed" | "failed") {
  if (status === "completed") return "success";
  if (status === "failed") return "danger";
  if (status === "running") return "warning";
  return "neutral";
}
```

```ts
// plugins/web/invoicing-console/src/client.ts
import { createORPCClient } from "@orpc/client";
import { OpenAPILink } from "@orpc/openapi-client/fetch";
import { capabilityClients } from "@rawr/composition";
import { toRunBadge } from "@rawr/invoicing/browser";

export function createInvoicingConsoleClient(baseUrl: string) {
  const api = createORPCClient(capabilityClients.invoicing.api, {
    link: new OpenAPILink({ url: `${baseUrl}/api/orpc` }),
  });

  const workflows = createORPCClient(capabilityClients.invoicing.workflows, {
    link: new OpenAPILink({ url: `${baseUrl}/api/workflows` }),
  });

  return {
    async runDemo(invoiceId: string) {
      const health = await api.healthCheck({}); // regular endpoint
      const trigger = await workflows.triggerReconciliation({ invoiceId, requestedBy: "mfe-user" }); // workflow endpoint
      return { health, runId: trigger.runId, badge: toRunBadge("queued") }; // browser-safe helper usage
    },
  };
}
```

### Runtime call sequence
1. Browser calls composed boundary clients (`/api/orpc` and `/api/workflows`).
2. Host route (`apps/server/src/rawr.ts`) forwards workflow call to `rawrHqManifest.workflows.triggerRouter` with context from `apps/server/src/workflows/context.ts`.
3. Workflow plugin boundary router authorizes/validates and enqueues event.
4. Runtime ingress `/api/inngest` handles signed runtime callbacks only.
5. Durable function executes in Inngest runtime and uses server-side package internal client for domain updates.
6. Browser reads status from caller-facing workflow/status API, never from `/api/inngest`.

## Auth Semantics Matrix
```yaml
auth_semantics:
  - caller: browser_micro_frontend
    client: composed boundary clients (api + workflows)
    auth: boundary auth/session/token on caller-facing routes
    allowed_paths:
      - /api/orpc/*
      - /api/workflows/<capability>/*
    forbidden_paths:
      - /api/inngest

  - caller: server_internal_tooling
    client: package internal client (in-process)
    auth: trusted service principal/context
    allowed_paths:
      - in_process_only
    forbidden_paths:
      - local_http_self_calls_as_default

  - caller: runtime_ingress
    client: inngest runtime bundle
    auth: signed ingress/runtime verification
    allowed_paths:
      - /api/inngest
    forbidden_paths:
      - browser_access
```

## Technical Lens
The manifest generator composes plugin-owned boundary contracts and routers into one host authority (`rawr.hq.ts`). That gives us one compositional source for SDK generation and route mounting while preserving strict runtime separation.

Packages remain reusable and transport-neutral. Plugins own boundary semantics and route contracts. Host wiring stays thin and explicit.

## Product Lens
For capability authors, this is simpler and safer:
- Shared logic and schemas live in packages.
- Boundary shape lives where boundary concerns belong (plugins).
- New capabilities flow through generation/composition, not ad hoc host edits.

For micro-frontend authors, the experience is predictable:
- Use one composed client surface per capability.
- Call regular + workflow endpoints with typed clients.
- Reuse browser-safe package helpers without touching runtime internals.

## Conflict Log (Rejected)
```yaml
conflicts:
  - id: package_owned_boundary_contracts
    rationale: "Blurs boundary ownership and conflicts with plugin-owned boundary principle."
  - id: browser_calls_to_runtime_ingress
    rationale: "Violates D-005 split and weakens security/runtime isolation."
  - id: plugin_to_plugin_runtime_imports
    rationale: "Creates coupling drift; shared reuse must flow through packages/composition."
```

## Changes vs Unchanged
- **Changes now:** boundary ownership is explicitly plugin-owned; synthesis now includes full client-mode and auth-mode behavior for browser, server-internal, and runtime ingress.
- **Unchanged:** D-005 route split, runtime ingress isolation, package internal client server-only posture, and no plugin-to-plugin runtime coupling.

## Close-Ready DECISIONS Wording
```yaml
d006:
  status: closed
  explanation: >-
    Workflow/API boundary contracts are plugin-owned. Capability packages own shared
    domain logic and domain schemas only. Workflow trigger/status I/O schemas are
    authored at the workflow plugin boundary contract (inline by default). Manifest
    composition consumes plugin boundary contracts/routers to build caller-facing surfaces.

d007:
  status: closed
  explanation: >-
    Micro-frontends and other network callers use manifest-composed boundary clients
    on /api/orpc/* and /api/workflows/<capability>/*. Server-internal callers may use
    package internal clients in-process. /api/inngest remains runtime-only ingress.
```

## D-008/D-009/D-010 Impacts (Open)
1. D-008: lock bootstrap order near host composition entry.
2. D-009: finalize dedupe marker MUST/SHOULD level in boundary middleware.
3. D-010: keep finished-hook guardrail explicitly idempotent/non-critical.

## Ordered Integration Steps
```yaml
integration_steps:
  - update_DECISIONS_d006_d007_with_plugin_owned_boundary_wording
  - align_AXES_01_02_03_07_08_with_client_and_auth_matrix
  - align_E2E_03_and_E2E_04_with_plugin_owned_boundary_contract_examples
  - run_contradiction_sweep_for_stale_package_owned_boundary_language
```
