# Axis 03: End-to-End Examples (Code-First)

This axis is intentionally code-heavy. It demonstrates exactly how the target model behaves in practice, with stable naming (`invoice-processing`) across all examples.

## Shared assumptions for all cases
1. Shared capability contracts/events/schemas live in `packages/invoice-processing/*`.
2. Runtime adapters live in surface plugin roots.
3. `rawr.hq.ts` is the only cross-surface composition file.
4. No plugin imports runtime code from another plugin.

## Shared package foundation

```ts
// packages/invoice-processing/src/schemas.ts
import { Type, type Static } from "typebox";

export const InvoiceAssessmentInputSchema = Type.Object(
  {
    invoiceId: Type.String({ minLength: 8, pattern: "^INV-" }),
    customerId: Type.String({ minLength: 3 }),
    amountCents: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
);

export const InvoiceAssessmentOutputSchema = Type.Object(
  {
    invoiceId: Type.String({ minLength: 8, pattern: "^INV-" }),
    status: Type.Union([
      Type.Literal("pending"),
      Type.Literal("needs-review"),
      Type.Literal("approved"),
    ]),
    riskScore: Type.Number({ minimum: 0, maximum: 1 }),
  },
  { additionalProperties: false },
);

export const InvoiceReconcileEventSchema = Type.Object(
  {
    runId: Type.String({ minLength: 1 }),
    invoiceId: Type.String({ minLength: 8, pattern: "^INV-" }),
    amountCents: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
);

export type InvoiceAssessmentInput = Static<typeof InvoiceAssessmentInputSchema>;
export type InvoiceAssessmentOutput = Static<typeof InvoiceAssessmentOutputSchema>;
export type InvoiceReconcileEvent = Static<typeof InvoiceReconcileEventSchema>;
```

```ts
// packages/invoice-processing/src/orpc/contract.ts
import { oc } from "@orpc/contract";
import { typeBoxStandardSchema } from "@rawr/coordination/orpc";
import { InvoiceAssessmentInputSchema, InvoiceAssessmentOutputSchema } from "../schemas";

export const invoiceProcessingContract = oc.router({
  assessInvoice: oc
    .route({
      method: "POST",
      path: "/invoice-processing/assess",
      tags: ["invoice-processing"],
      summary: "Assess invoice risk",
      operationId: "invoiceProcessingAssess",
    })
    .input(typeBoxStandardSchema(InvoiceAssessmentInputSchema))
    .output(typeBoxStandardSchema(InvoiceAssessmentOutputSchema)),
});
```

```ts
// packages/invoice-processing/src/operations.ts
import type { InvoiceAssessmentInput, InvoiceAssessmentOutput } from "./schemas";

export function assessInvoice(input: InvoiceAssessmentInput): InvoiceAssessmentOutput {
  const score = Math.min(1, input.amountCents / 150_000);
  return {
    invoiceId: input.invoiceId,
    status: score > 0.65 ? "needs-review" : "pending",
    riskScore: score,
  };
}
```

---

## Case A: Single API Plugin (Minimal Composition)

### Why this case exists
This proves the minimum end-to-end path: package contract + API adapter + manifest composition + host mount.

### File structure
```text
packages/invoice-processing/src/{schemas.ts,orpc/contract.ts,operations.ts}
plugins/api/invoice-processing-api/src/index.ts
rawr.hq.ts
apps/server/src/rawr.ts
```

### API adapter
```ts
// plugins/api/invoice-processing-api/src/index.ts
import { implement } from "@orpc/server";
import { invoiceProcessingContract } from "@rawr/invoice-processing/orpc/contract";
import { assessInvoice } from "@rawr/invoice-processing/operations";

export type InvoiceApiContext = {
  requestId: string;
};

export function registerApiPlugin() {
  const os = implement<typeof invoiceProcessingContract, InvoiceApiContext>(invoiceProcessingContract);

  return {
    namespace: "invoiceProcessing" as const,
    contract: invoiceProcessingContract,
    router: os.router({
      assessInvoice: os.assessInvoice.handler(async ({ input }) => {
        return assessInvoice(input);
      }),
    }),
  };
}
```

### Composition manifest
```ts
// rawr.hq.ts (Case A excerpt)
import { oc } from "@orpc/contract";
import { registerApiPlugin } from "./plugins/api/invoice-processing-api/src";

const invoiceApi = registerApiPlugin();

export const rawrHqManifest = {
  orpc: {
    contract: oc.router({
      invoiceProcessing: invoiceApi.contract,
    }),
    router: {
      invoiceProcessing: invoiceApi.router,
    },
    context: {
      requestId: "runtime-generated",
    },
  },
  inngest: {
    client: null,
    functions: [],
  },
  web: { mounts: [] },
  cli: { commands: [] },
  agents: { capabilities: [] },
} as const;
```

### Host mount
```ts
// apps/server/src/rawr.ts (Case A excerpt)
import { RPCHandler } from "@orpc/server/fetch";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { implement } from "@orpc/server";
import { rawrHqManifest } from "../../rawr.hq";

export function mountOrpcRoutes(app: any) {
  const os = implement<typeof rawrHqManifest.orpc.contract, typeof rawrHqManifest.orpc.context>(
    rawrHqManifest.orpc.contract,
  );
  const router = os.router(rawrHqManifest.orpc.router);

  const rpc = new RPCHandler(router);
  const openapi = new OpenAPIHandler(router);

  app.all("/rpc/*", async ({ request }: any) => {
    const { response } = await rpc.handle(request, {
      prefix: "/rpc",
      context: rawrHqManifest.orpc.context,
    });
    return response ?? new Response("Not Found", { status: 404 });
  });

  app.all("/api/orpc/*", async ({ request }: any) => {
    const { response } = await openapi.handle(request, {
      prefix: "/api/orpc",
      context: rawrHqManifest.orpc.context,
    });
    return response ?? new Response("Not Found", { status: 404 });
  });
}
```

### Implication
A new API capability can be shipped without editing cross-surface host composition logic outside `rawr.hq.ts`.

---

## Case B: One capability across CLI + Workflows

### Why this case exists
This proves the architecture can span request-time and durable execution surfaces while preserving import boundaries.

### File structure
```text
packages/invoice-processing/src/{schemas.ts,operations.ts,workflows/reconcile.ts}
plugins/cli/invoice-processing-cli/src/commands/reconcile.ts
plugins/workflows/invoice-processing-workflows/src/index.ts
rawr.hq.ts
apps/cli/src/index.ts
apps/server/src/rawr.ts
```

### Workflow registration
```ts
// packages/invoice-processing/src/workflows/reconcile.ts
import type { Inngest } from "inngest";
import { Value } from "typebox/value";
import { InvoiceReconcileEventSchema } from "../schemas";

export const INVOICE_RECONCILE_EVENT = "invoice-processing.reconcile" as const;

export function registerInvoiceReconcileFunction(client: Inngest) {
  return client.createFunction(
    { id: "invoice-processing-reconcile", name: "Invoice Reconcile", retries: 2 },
    { event: INVOICE_RECONCILE_EVENT },
    async ({ event, step }) => {
      if (!Value.Check(InvoiceReconcileEventSchema, event.data)) {
        throw new Error("invalid invoice reconcile payload");
      }

      await step.run("mark-running", async () => {
        // persist state transition
      });

      await step.run("apply-reconcile", async () => {
        // business logic action
      });

      await step.run("mark-complete", async () => {
        // persist completion state
      });

      return { ok: true, runId: event.data.runId };
    },
  );
}
```

### CLI command
```ts
// plugins/cli/invoice-processing-cli/src/commands/reconcile.ts
import { Command, Flags } from "@oclif/core";
import type { Inngest } from "inngest";
import { INVOICE_RECONCILE_EVENT } from "@rawr/invoice-processing/workflows/reconcile";

export class InvoiceReconcileCommand extends Command {
  static summary = "Queue invoice reconciliation";

  static flags = {
    invoiceId: Flags.string({ required: true }),
    amountCents: Flags.integer({ required: true }),
    runId: Flags.string({ required: true }),
  };

  constructor(argv: string[], config: any, private readonly inngestClient: Inngest) {
    super(argv, config);
  }

  async run() {
    const { flags } = await this.parse(InvoiceReconcileCommand);

    await this.inngestClient.send({
      name: INVOICE_RECONCILE_EVENT,
      data: {
        runId: flags.runId,
        invoiceId: flags.invoiceId,
        amountCents: flags.amountCents,
      },
    });

    this.log(`queued reconcile run ${flags.runId}`);
  }
}
```

### Workflow plugin adapter
```ts
// plugins/workflows/invoice-processing-workflows/src/index.ts
import { Inngest } from "inngest";
import { registerInvoiceReconcileFunction } from "@rawr/invoice-processing/workflows/reconcile";

export function registerWorkflowPlugin() {
  const client = new Inngest({ id: "rawr-hq" });
  const fn = registerInvoiceReconcileFunction(client);

  return {
    client,
    functions: [fn] as const,
  };
}
```

### Manifest excerpt
```ts
// rawr.hq.ts (Case B excerpt)
import { registerWorkflowPlugin } from "./plugins/workflows/invoice-processing-workflows/src";

const invoiceWorkflow = registerWorkflowPlugin();

export const rawrHqManifest = {
  // ...orpc from Case A
  inngest: {
    client: invoiceWorkflow.client,
    functions: [...invoiceWorkflow.functions],
  },
  // ...web/cli/agents
} as const;
```

### Implication
One capability can evolve from API-only into multi-surface behavior without collapsing boundaries or introducing plugin-to-plugin runtime coupling.

---

## Case C: Full capability (`api + workflows + web + cli + agents + mcp`)

### Why this case exists
This proves the architecture can support a "desk/hub" capability while keeping composition explicit and dependency direction clean.

### File structure
```text
packages/invoice-processing/src/
  schemas.ts
  orpc/contract.ts
  operations.ts
  workflows/reconcile.ts
  knowledge/{cli.ts,web.ts,index.ts}
plugins/api/invoice-processing-api/src/index.ts
plugins/workflows/invoice-processing-workflows/src/index.ts
plugins/web/invoice-processing-web/src/index.ts
plugins/cli/invoice-processing-cli/src/commands/{reconcile.ts,monitor.ts}
plugins/agents/invoice-processing-agent/src/index.ts
plugins/mcp/invoice-processing-mcp/src/index.ts
rawr.hq.ts
apps/{server,web,cli}/...
```

### Package-owned knowledge assets
```ts
// packages/invoice-processing/src/knowledge/cli.ts
export const invoiceCliKnowledge = {
  commands: [
    { id: "invoice-processing.reconcile", summary: "Queue invoice reconciliation" },
    { id: "invoice-processing.monitor", summary: "Monitor invoice signal density" },
  ],
};
```

```ts
// packages/invoice-processing/src/knowledge/web.ts
export const invoiceWebKnowledge = {
  routes: [{ path: "/invoice-processing/dashboard", summary: "Invoice operations dashboard" }],
};
```

```ts
// packages/invoice-processing/src/knowledge/index.ts
import { invoiceCliKnowledge } from "./cli";
import { invoiceWebKnowledge } from "./web";

export const invoiceAgentKnowledge = {
  cli: invoiceCliKnowledge,
  web: invoiceWebKnowledge,
  escalation: "Escalate after 3 failed reconcile runs in 24h.",
};
```

### Agent plugin consuming knowledge assets
```ts
// plugins/agents/invoice-processing-agent/src/index.ts
import { invoiceAgentKnowledge } from "@rawr/invoice-processing/knowledge";

export function registerAgentPlugin() {
  return {
    capabilities: [
      {
        capabilityId: "invoice-processing",
        description: "Finance operations assistant for invoice processing",
      },
    ],
    knowledgeRefs: [
      {
        id: "invoice-agent-knowledge",
        sourcePackage: "@rawr/invoice-processing",
        sourceExport: "invoiceAgentKnowledge",
      },
    ],
    knowledge: invoiceAgentKnowledge,
  };
}
```

### Web plugin
```ts
// plugins/web/invoice-processing-web/src/index.ts
import type { AnyElysia } from "../../../apps/server/src/plugins";
import { invoiceWebKnowledge } from "@rawr/invoice-processing/knowledge/web";

export function registerWebPlugin() {
  return {
    mounts: [
      {
        pluginId: "invoice-processing-web",
        mountId: "invoice-dashboard",
        load: async () => invoiceWebKnowledge,
      },
    ],
    server: (app: AnyElysia) => {
      app.get("/invoice-processing/dashboard", () => ({ ok: true, ...invoiceWebKnowledge }));
    },
  };
}
```

### MCP plugin
```ts
// plugins/mcp/invoice-processing-mcp/src/index.ts
export function registerMcpPlugin() {
  return {
    actions: [
      {
        actionId: "invoice-processing.assess",
        description: "Assess invoice risk through typed contract",
      },
      {
        actionId: "invoice-processing.reconcile",
        description: "Queue invoice reconciliation workflow",
      },
    ],
  };
}
```

### Full manifest composition
```ts
// rawr.hq.ts (Case C excerpt)
import { oc } from "@orpc/contract";
import { registerApiPlugin as registerInvoiceApi } from "./plugins/api/invoice-processing-api/src";
import { registerWorkflowPlugin as registerInvoiceWorkflow } from "./plugins/workflows/invoice-processing-workflows/src";
import { registerWebPlugin as registerInvoiceWeb } from "./plugins/web/invoice-processing-web/src";
import { registerCliPlugin as registerInvoiceCli } from "./plugins/cli/invoice-processing-cli/src";
import { registerAgentPlugin as registerInvoiceAgent } from "./plugins/agents/invoice-processing-agent/src";
import { registerMcpPlugin as registerInvoiceMcp } from "./plugins/mcp/invoice-processing-mcp/src";

const invoiceApi = registerInvoiceApi();
const invoiceWorkflow = registerInvoiceWorkflow();
const invoiceWeb = registerInvoiceWeb();
const invoiceCli = registerInvoiceCli(invoiceWorkflow.client);
const invoiceAgent = registerInvoiceAgent();
const invoiceMcp = registerInvoiceMcp();

export const rawrHqManifest = {
  orpc: {
    contract: oc.router({ invoiceProcessing: invoiceApi.contract }),
    router: { invoiceProcessing: invoiceApi.router },
    context: { requestId: "runtime-generated", inngestClient: invoiceWorkflow.client },
  },
  inngest: {
    client: invoiceWorkflow.client,
    functions: [...invoiceWorkflow.functions],
  },
  web: {
    mounts: [...invoiceWeb.mounts],
  },
  cli: {
    commands: [...invoiceCli.commands],
  },
  agents: {
    capabilities: [...invoiceAgent.capabilities],
  },
  mcp: {
    actions: [...invoiceMcp.actions],
  },
} as const;
```

### Implication
A capability can scale to a full operational hub while preserving a single composition authority and strict dependency boundaries.

---

## Import policy with concrete examples

### Allowed
```ts
// plugin -> package
import { invoiceProcessingContract } from "@rawr/invoice-processing/orpc/contract";
```

```ts
// agent plugin -> package-owned knowledge assets
import { invoiceAgentKnowledge } from "@rawr/invoice-processing/knowledge";
```

### Disallowed
```ts
// plugin -> plugin runtime import (not allowed)
import { registerWorkflowPlugin } from "@rawr/plugin-invoice-processing-workflows";
```

```ts
// agent plugin importing runtime code from web plugin (not allowed)
import { registerWebPlugin } from "@rawr/plugin-invoice-processing-web";
```

## Validation checklist
1. All cases wire through `rawr.hq.ts`.
2. No runtime plugin-to-plugin imports appear.
3. Agent plugin uses package-owned knowledge assets.
4. API/workflow surfaces remain separate while sharing package contracts/events.
