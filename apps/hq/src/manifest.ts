import { registerCoordinationApiPlugin } from "@rawr/plugin-api-coordination/server";
import { registerExampleTodoApiPlugin } from "@rawr/plugin-api-example-todo/server";
import { registerStateApiPlugin } from "@rawr/plugin-api-state/server";
import {
  registerCoordinationWorkflowPlugin,
} from "@rawr/plugin-workflows-coordination/server";
import {
  registerSupportExampleWorkflowPlugin,
} from "@rawr/plugin-workflows-support-example/server";

/**
 * @agents-style seam-law declaration -> host binding -> request/process materialization
 * @agents-style canonical app composition authority
 *
 * Owns:
 * - which plugin registrations exist for HQ
 * - app-local composition facts only
 *
 * Must not own:
 * - host satisfier construction
 * - bound plugin contributions
 * - ORPC/workflow router materialization
 * - request-scoped or process-scoped executable runtime surfaces
 *
 * Canonical:
 * - `plugins`
 *
 * Transitional:
 * - narrow server-side consumption of `@rawr/hq-app/manifest` as composition input
 *   may remain while the split-project topology exists
 */
export function createRawrHqManifest() {
  const apiPlugins = {
    coordination: registerCoordinationApiPlugin(),
    state: registerStateApiPlugin(),
    exampleTodo: registerExampleTodoApiPlugin(),
  } as const;

  const workflowPlugins = {
    supportExample: registerSupportExampleWorkflowPlugin(),
    coordination: registerCoordinationWorkflowPlugin(),
  } as const;

  // The HQ app defines which plugin registrations exist. Binding and runtime
  // realization happen in the host-owned server seam.
  return {
    plugins: {
      api: apiPlugins,
      workflows: workflowPlugins,
    },
  } as const;
}

export type RawrHqManifest = ReturnType<typeof createRawrHqManifest>;
