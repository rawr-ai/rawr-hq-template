import {
  createCoordinationInngestFunction,
  createInngestServeHandler,
  type CoordinationFunctionBundle,
  type CoordinationRuntimeAdapter,
} from "./packages/coordination-inngest/src/adapter";
import { createHqRuntimeRouter, createWorkflowTriggerRuntimeRouter } from "./packages/core/src/orpc/runtime-router";

const composedOrpcRouter = createHqRuntimeRouter();
const composedWorkflowTriggerRouter = createWorkflowTriggerRuntimeRouter();

export const rawrHqManifest = {
  orpc: {
    router: composedOrpcRouter,
  },
  workflows: {
    capabilities: {
      coordination: {
        pathPrefix: "/coordination",
      },
    },
    triggerRouter: composedWorkflowTriggerRouter,
  },
  inngest: {
    bundleFactory: (runtime: CoordinationRuntimeAdapter): CoordinationFunctionBundle =>
      createCoordinationInngestFunction({ runtime }),
    serveHandlerFactory: (bundle: CoordinationFunctionBundle) =>
      createInngestServeHandler({ client: bundle.client, functions: bundle.functions }),
  },
} as const;

export type RawrHqManifest = typeof rawrHqManifest;
