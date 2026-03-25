import {
  composeApiPlugins,
  type ApiPluginRegistration,
  type MaterializedApiPluginRegistration,
} from "@rawr/hq-sdk/apis";
import { composeWorkflowPlugins, type WorkflowPluginRegistration } from "@rawr/hq-sdk/workflows";
import type { RawrHqManifest } from "@rawr/hq-app/manifest";
import type { RawrHostSatisfiers } from "./host-satisfiers";

/**
 * @agents-style seam-law declaration -> host binding -> request/process materialization
 * @agents-style canonical host binding seam
 *
 * Owns:
 * - binding app-selected plugin declarations against host-owned satisfiers
 * - composing bound API/workflow contributions into one bound role plan
 *
 * Must not own:
 * - satisfier construction
 * - request context creation
 * - ORPC/OpenAPI/Inngest handler materialization
 * - route mounting
 *
 * Canonical:
 * - `createRawrHostBoundRolePlan({ manifest, satisfiers })`
 *
 * Transitional:
 * - narrow consumption of `@rawr/hq-app/manifest` as composition input only
 */
function bindApiPluginRegistration<TPlugin extends ApiPluginRegistration>(
  plugin: TPlugin,
  bound?: unknown,
): MaterializedApiPluginRegistration {
  if (!plugin.contribute || bound === undefined) {
    return plugin as MaterializedApiPluginRegistration;
  }

  return {
    ...plugin,
    ...plugin.contribute(bound as never),
  } satisfies MaterializedApiPluginRegistration;
}

function bindWorkflowPluginRegistration<TPlugin extends WorkflowPluginRegistration>(
  plugin: TPlugin,
  bound?: unknown,
): TPlugin {
  if (!plugin.contribute || bound === undefined) {
    return plugin;
  }

  return {
    ...plugin,
    ...plugin.contribute(bound as never),
  };
}

function bindRawrHqApiPlugins(input: {
  manifest: RawrHqManifest;
  satisfiers: RawrHostSatisfiers;
}) {
  return [
    bindApiPluginRegistration(
      input.manifest.plugins.api.coordination,
      {
        resolveClient: input.satisfiers.coordination.resolveWorkflowClient,
      },
    ),
    bindApiPluginRegistration(
      input.manifest.plugins.api.state,
      {
        resolveClient: input.satisfiers.state.resolveClient,
      },
    ),
    bindApiPluginRegistration(
      input.manifest.plugins.api.exampleTodo,
      {
        resolveClient: input.satisfiers.exampleTodo.resolveClient,
      },
    ),
  ] as const;
}

function bindRawrHqWorkflowPlugins(input: {
  manifest: RawrHqManifest;
  satisfiers: RawrHostSatisfiers;
}) {
  return [
    bindWorkflowPluginRegistration(
      input.manifest.plugins.workflows.supportExample,
      {
        resolveSupportExampleClient: input.satisfiers.supportExample.resolveClient,
      },
    ),
    bindWorkflowPluginRegistration(
      input.manifest.plugins.workflows.coordination,
      {
        resolveAuthoringClient: input.satisfiers.coordination.resolveWorkflowClient,
      },
    ),
  ] as const;
}

export type RawrHostBoundRolePlan = Readonly<{
  apiPlugins: readonly MaterializedApiPluginRegistration[];
  workflowPlugins: readonly WorkflowPluginRegistration[];
  api: ReturnType<typeof composeApiPlugins>;
  workflows: ReturnType<typeof composeWorkflowPlugins>;
}>;

/**
 * Converts HQ app composition input plus host-owned satisfiers into the bound
 * role plan consumed by host realization.
 */
export function createRawrHostBoundRolePlan(input: {
  manifest: RawrHqManifest;
  satisfiers: RawrHostSatisfiers;
}): RawrHostBoundRolePlan {
  const apiPlugins = bindRawrHqApiPlugins(input);
  const workflowPlugins = bindRawrHqWorkflowPlugins(input);

  return {
    apiPlugins,
    workflowPlugins,
    api: composeApiPlugins(apiPlugins),
    workflows: composeWorkflowPlugins(workflowPlugins),
  };
}
