import {
  composeApiPlugins,
  type MaterializedApiPluginRegistration,
} from "@rawr/hq-sdk/apis";
import { composeWorkflowPlugins, type WorkflowPluginRegistration } from "@rawr/hq-sdk/workflows";
import type { RawrHqManifest } from "../../../rawr.hq";
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
 * - narrow consumption of `rawr.hq.ts` as composition input only while the
 *   repo converges on explicit HQ role entrypoints
 *
 * Must stay strict:
 * - every canonical plugin family binds through `contribute(bound)`
 * - no fallback to pre-materialized or partially bound plugin shapes
 */

function bindRawrHqApiPlugins(input: {
  manifest: RawrHqManifest;
  satisfiers: RawrHostSatisfiers;
}) {
  const coordination = input.manifest.plugins.api.coordination;
  const state = input.manifest.plugins.api.state;
  const exampleTodo = input.manifest.plugins.api.exampleTodo;

  return [
    {
      ...coordination,
      ...coordination.contribute!({
        resolveClient: input.satisfiers.coordination.resolveWorkflowClient,
      }),
    } satisfies MaterializedApiPluginRegistration,
    {
      ...state,
      ...state.contribute!({
        resolveClient: input.satisfiers.state.resolveClient,
      }),
    } satisfies MaterializedApiPluginRegistration,
    {
      ...exampleTodo,
      ...exampleTodo.contribute!({
        resolveClient: input.satisfiers.exampleTodo.resolveClient,
      }),
    } satisfies MaterializedApiPluginRegistration,
  ] as const;
}

function bindRawrHqWorkflowPlugins(input: {
  manifest: RawrHqManifest;
  satisfiers: RawrHostSatisfiers;
}) {
  const supportExample = input.manifest.plugins.workflows.supportExample;
  const coordination = input.manifest.plugins.workflows.coordination;

  return [
    {
      ...supportExample,
      ...supportExample.contribute!({
        resolveSupportExampleClient: input.satisfiers.supportExample.resolveClient,
      }),
    } satisfies WorkflowPluginRegistration,
    {
      ...coordination,
      ...coordination.contribute!({
        resolveAuthoringClient: input.satisfiers.coordination.resolveWorkflowClient,
      }),
    } satisfies WorkflowPluginRegistration,
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
