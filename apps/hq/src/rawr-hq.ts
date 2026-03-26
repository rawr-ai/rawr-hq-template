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
 * Canonical HQ app manifest composition authority.
 *
 * Role/surface shape:
 * - roles.server.api
 * - roles.server.internal
 * - roles.async.workflows
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

  return {
    roles: {
      server: {
        api: apiPlugins,
        internal: {
          api: apiPlugins,
          workflows: workflowPlugins,
        },
      },
      async: {
        workflows: workflowPlugins,
      },
    },
  } as const;
}

export type RawrHqManifest = ReturnType<typeof createRawrHqManifest>;
