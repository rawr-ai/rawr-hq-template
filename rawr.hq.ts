import { randomUUID } from "node:crypto";
import { createRouterClient } from "@orpc/server";
import { createInngestServeHandler } from "@rawr/coordination-inngest";
import { createHqRuntimeRouter } from "@rawr/core/orpc";
import {
  createInMemoryTriageWorkItemStore,
  supportTriageClientRouter,
  type SupportTriageServiceDeps,
} from "@rawr/support-triage";
import { Inngest } from "inngest";
import { registerSupportTriageApiPlugin } from "./plugins/api/support-triage";
import { createSupportTriageInngestFunctions, registerSupportTriageWorkflowPlugin } from "./plugins/workflows/support-triage";

// Keep capability fixture state stable per repo root across requests in local dev/test runs.
const supportTriageDepsByRepoRoot = new Map<string, SupportTriageServiceDeps>();

function createSupportTriageWorkItemId(): string {
  return `support-triage-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
}

function resolveSupportTriageDeps(repoRoot: string): SupportTriageServiceDeps {
  const existing = supportTriageDepsByRepoRoot.get(repoRoot);
  if (existing) {
    return existing;
  }

  const deps: SupportTriageServiceDeps = {
    store: createInMemoryTriageWorkItemStore(),
    now: () => new Date().toISOString(),
    generateWorkItemId: createSupportTriageWorkItemId,
  };
  supportTriageDepsByRepoRoot.set(repoRoot, deps);
  return deps;
}

function enrichSupportTriageContext<T extends { repoRoot: string }>(context: T) {
  return {
    ...context,
    supportTriage: createRouterClient(supportTriageClientRouter, {
      context: {
        deps: resolveSupportTriageDeps(context.repoRoot),
      },
    }),
  };
}

// Host owns one runtime client instance and injects it into the workflow bundle.
const supportTriageInngestClient = new Inngest({ id: "rawr-support-triage" });

const coreOrpcRouter = createHqRuntimeRouter();
const supportTriageApiPlugin = registerSupportTriageApiPlugin();
const supportTriageWorkflowPlugin = registerSupportTriageWorkflowPlugin();
const composedOrpcRouter = {
  ...coreOrpcRouter,
  ...supportTriageApiPlugin.router,
};
const composedWorkflowTriggerRouter = supportTriageWorkflowPlugin.router;
const supportTriageInngestFunctions = createSupportTriageInngestFunctions({
  client: supportTriageInngestClient,
  resolveSupportTriageDeps,
});

export const rawrHqManifest = {
  fixtures: {
    supportTriage: {
      resolveServiceDeps: resolveSupportTriageDeps,
    },
  },
  orpc: {
    router: composedOrpcRouter,
    enrichContext: enrichSupportTriageContext,
  },
  workflows: {
    capabilities: {
      "support-triage": {
        pathPrefix: "/support-triage",
      },
    },
    triggerRouter: composedWorkflowTriggerRouter,
    enrichContext: enrichSupportTriageContext,
  },
  inngest: {
    client: supportTriageInngestClient,
    functions: supportTriageInngestFunctions,
    handler: createInngestServeHandler({ client: supportTriageInngestClient, functions: supportTriageInngestFunctions }),
  },
} as const;

export type RawrHqManifest = typeof rawrHqManifest;
