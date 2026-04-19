import {
  composeApiPlugins,
  type ApiPluginRegistration,
  type MaterializedApiPluginRegistration,
} from "@rawr/hq-sdk/apis";
import { materializeRequestScopedPluginSurfaces } from "@rawr/hq-sdk/composition";
import { composeWorkflowPlugins, type WorkflowPluginRegistration } from "@rawr/hq-sdk/workflows";
import type { RawrHqManifest } from "@rawr/hq-app/manifest";
import type { BoundaryRequestSupportContext } from "@rawr/runtime-context";

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

function bindRawrHqApiPlugins(manifest: RawrHqManifest) {
  return [
    manifest.plugins.api.coordination as MaterializedApiPluginRegistration,
    manifest.plugins.api.state as MaterializedApiPluginRegistration,
    bindApiPluginRegistration(
      manifest.plugins.api.exampleTodo,
      {
        resolveClient: manifest.fixtures.exampleTodo.resolveClient,
      },
    ),
  ] as const;
}

function bindRawrHqWorkflowPlugins(manifest: RawrHqManifest) {
  return [
    bindWorkflowPluginRegistration(
      manifest.plugins.workflows.supportExample,
      {
        resolveSupportExampleClient: manifest.fixtures.supportExample.resolveClient,
      },
    ),
    manifest.plugins.workflows.coordination,
  ] as const;
}

export type RawrHostBoundRolePlan = Readonly<{
  apiPlugins: readonly MaterializedApiPluginRegistration[];
  workflowPlugins: readonly WorkflowPluginRegistration[];
  api: ReturnType<typeof composeApiPlugins>;
  workflows: ReturnType<typeof composeWorkflowPlugins>;
}>;

export function createRawrHostBoundRolePlan(input: {
  manifest: RawrHqManifest;
}): RawrHostBoundRolePlan {
  const apiPlugins = bindRawrHqApiPlugins(input.manifest);
  const workflowPlugins = bindRawrHqWorkflowPlugins(input.manifest);

  return {
    apiPlugins,
    workflowPlugins,
    api: composeApiPlugins(apiPlugins),
    workflows: composeWorkflowPlugins(workflowPlugins),
  };
}

export function materializeRawrHostBoundRolePlan(
  boundRolePlan: RawrHostBoundRolePlan,
) {
  const materialized = materializeRequestScopedPluginSurfaces<
    BoundaryRequestSupportContext,
    typeof boundRolePlan.workflows.createInngestFunctions
  >({
    api: boundRolePlan.api,
    workflows: boundRolePlan.workflows,
  });

  return {
    ...materialized,
  } as const;
}
