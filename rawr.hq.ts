import {
  createCoordinationInngestFunction,
  createInngestServeHandler,
  type CoordinationFunctionBundle,
  type CoordinationRuntimeAdapter,
} from "./packages/coordination-inngest/src/adapter";
import { createOrpcRouter, createWorkflowTriggerRouter } from "./apps/server/src/orpc";

const composedOrpcRouter = createOrpcRouter();
const composedWorkflowTriggerRouter = createWorkflowTriggerRouter();

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
