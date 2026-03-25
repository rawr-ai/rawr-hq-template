import {
  composeApiPlugins,
  type MaterializedApiPluginRegistration,
} from "@rawr/hq-sdk/apis";
import { composeWorkflowPlugins, type WorkflowPluginRegistration } from "@rawr/hq-sdk/workflows";
import type { CoordinationApiPluginRegistration } from "@rawr/plugin-api-coordination/server";
import type { ExampleTodoApiPluginRegistration } from "@rawr/plugin-api-example-todo/server";
import type { StateApiPluginRegistration } from "@rawr/plugin-api-state/server";
import type { CoordinationWorkflowPluginRegistration } from "@rawr/plugin-workflows-coordination/server";
import type { SupportExampleWorkflowPluginRegistration } from "@rawr/plugin-workflows-support-example/server";
import type { RawrHostSatisfiers } from "./host-satisfiers";

export type RawrHostDeclarations = Readonly<{
  api: Readonly<{
    coordination: CoordinationApiPluginRegistration;
    state: StateApiPluginRegistration;
    exampleTodo: ExampleTodoApiPluginRegistration;
  }>;
  workflows: Readonly<{
    supportExample: SupportExampleWorkflowPluginRegistration;
    coordination: CoordinationWorkflowPluginRegistration;
  }>;
}>;

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
 * - `createRawrHostBoundRolePlan({ declarations, satisfiers })`
 *
 * Transitional:
 * - app-manifest intake is localized upstream in `host-composition.ts`
 *
 * Must stay strict:
 * - every canonical plugin family binds through `contribute(bound)`
 * - no fallback to pre-materialized or partially bound plugin shapes
 */

function bindRawrHqApiPlugins(input: {
  declarations: RawrHostDeclarations;
  satisfiers: RawrHostSatisfiers;
}) {
  const coordination = input.declarations.api.coordination;
  const state = input.declarations.api.state;
  const exampleTodo = input.declarations.api.exampleTodo;

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
  declarations: RawrHostDeclarations;
  satisfiers: RawrHostSatisfiers;
}) {
  const supportExample = input.declarations.workflows.supportExample;
  const coordination = input.declarations.workflows.coordination;

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
  declarations: RawrHostDeclarations;
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
