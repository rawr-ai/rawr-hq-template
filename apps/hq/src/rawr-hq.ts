import { coordinationApiPlugin } from "@rawr/plugin-api-coordination/plugin";
import { exampleTodoApiPlugin } from "@rawr/plugin-api-example-todo/plugin";
import { stateApiPlugin } from "@rawr/plugin-api-state/plugin";
import { coordinationWorkflowPlugin } from "@rawr/plugin-workflows-coordination/plugin";
import { supportExampleWorkflowPlugin } from "@rawr/plugin-workflows-support-example/plugin";

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
    coordination: coordinationApiPlugin,
    state: stateApiPlugin,
    exampleTodo: exampleTodoApiPlugin,
  } as const;

  const workflowPlugins = {
    supportExample: supportExampleWorkflowPlugin,
    coordination: coordinationWorkflowPlugin,
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
