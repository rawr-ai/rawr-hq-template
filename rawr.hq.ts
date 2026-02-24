import { randomUUID } from "node:crypto";
import { createRouterClient } from "@orpc/server";
import { createInngestServeHandler } from "@rawr/coordination-inngest";
import { createHqRuntimeRouter } from "@rawr/core/orpc";
import {
  supportExampleClientProcedures,
  type SupportExampleClient,
  type SupportExampleClientContext,
} from "@rawr/support-example/client";
import type { TriageWorkItem } from "@rawr/support-example/domain";
import { Inngest } from "inngest";
import { registerSupportExampleApiPlugin } from "./plugins/api/support-example";
import { createSupportExampleInngestFunctions, registerSupportExampleWorkflowPlugin } from "./plugins/workflows/support-example";

// Keep capability fixture state stable per repo root across requests in local dev/test runs.
type SupportExampleServiceDeps = SupportExampleClientContext["deps"];
const supportExampleDepsByRepoRoot = new Map<string, SupportExampleServiceDeps>();

function createInMemoryTriageWorkItemStore(): SupportExampleServiceDeps["store"] {
  const workItems = new Map<string, TriageWorkItem>();

  return {
    async save(workItem: TriageWorkItem): Promise<void> {
      workItems.set(workItem.workItemId, { ...workItem });
    },

    async get(workItemId: string): Promise<TriageWorkItem | null> {
      const workItem = workItems.get(workItemId);
      return workItem ? { ...workItem } : null;
    },

    async list(): Promise<TriageWorkItem[]> {
      return [...workItems.values()].map((workItem) => ({ ...workItem }));
    },
  };
}

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

function resolveSupportExampleClient(repoRoot: string): SupportExampleClient {
  return createRouterClient(supportExampleClientProcedures, {
    context: {
      deps: resolveSupportExampleDeps(repoRoot),
    },
  });
}

function enrichSupportExampleContext<T extends { repoRoot: string }>(context: T) {
  return {
    ...context,
    supportExample: resolveSupportExampleClient(context.repoRoot),
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
  resolveSupportExampleClient,
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
        pathPrefix: "/support-example/triage",
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
