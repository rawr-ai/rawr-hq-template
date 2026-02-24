import { randomUUID } from "node:crypto";
import { createRouterClient } from "@orpc/server";
import { createInngestServeHandler } from "@rawr/coordination-inngest";
import { createHqRuntimeRouter } from "@rawr/core/orpc";
import {
  createInMemoryTriageWorkItemStore,
  supportExampleClientProcedures,
  type SupportExampleServiceDeps,
} from "@rawr/support-example";
import { Inngest } from "inngest";
import { registerSupportExampleApiPlugin } from "./plugins/api/support-example";
import { createSupportExampleInngestFunctions, registerSupportExampleWorkflowPlugin } from "./plugins/workflows/support-example";

// Keep capability fixture state stable per repo root across requests in local dev/test runs.
const supportExampleDepsByRepoRoot = new Map<string, SupportExampleServiceDeps>();

function createSupportExampleWorkItemId(): string {
  return `support-example-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
}

function resolveSupportExampleDeps(repoRoot: string): SupportExampleServiceDeps {
  const existing = supportExampleDepsByRepoRoot.get(repoRoot);
  if (existing) {
    return existing;
  }

  const deps: SupportExampleServiceDeps = {
    store: createInMemoryTriageWorkItemStore(),
    now: () => new Date().toISOString(),
    generateWorkItemId: createSupportExampleWorkItemId,
  };
  supportExampleDepsByRepoRoot.set(repoRoot, deps);
  return deps;
}

function enrichSupportExampleContext<T extends { repoRoot: string }>(context: T) {
  return {
    ...context,
    supportExample: createRouterClient(supportExampleClientProcedures, {
      context: {
        deps: resolveSupportExampleDeps(context.repoRoot),
      },
    }),
  };
}

// Host owns one runtime client instance and injects it into the workflow bundle.
const supportExampleInngestClient = new Inngest({ id: "rawr-support-example" });

const coreOrpcRouter = createHqRuntimeRouter();
const supportExampleApiPlugin = registerSupportExampleApiPlugin();
const supportExampleWorkflowPlugin = registerSupportExampleWorkflowPlugin();
const composedOrpcRouter = {
  ...coreOrpcRouter,
  ...supportExampleApiPlugin.router,
};
const composedWorkflowTriggerRouter = supportExampleWorkflowPlugin.router;
const supportExampleInngestFunctions = createSupportExampleInngestFunctions({
  client: supportExampleInngestClient,
  resolveSupportExampleDeps,
});

export const rawrHqManifest = {
  fixtures: {
    supportExample: {
      resolveServiceDeps: resolveSupportExampleDeps,
    },
  },
  orpc: {
    router: composedOrpcRouter,
    enrichContext: enrichSupportExampleContext,
  },
  workflows: {
    capabilities: {
      "support-example": {
        pathPrefix: "/support-example",
      },
    },
    triggerRouter: composedWorkflowTriggerRouter,
    enrichContext: enrichSupportExampleContext,
  },
  inngest: {
    client: supportExampleInngestClient,
    functions: supportExampleInngestFunctions,
    handler: createInngestServeHandler({ client: supportExampleInngestClient, functions: supportExampleInngestFunctions }),
  },
} as const;

export type RawrHqManifest = typeof rawrHqManifest;
