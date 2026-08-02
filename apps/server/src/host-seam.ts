import {
  composeApiPlugins,
  type MaterializedApiPluginRegistration,
} from "@habitat-ai/rawr-hq-sdk/apis";
import {
  composeWorkflowPlugins,
  type WorkflowPluginRegistration,
} from "@habitat-ai/rawr-hq-sdk/workflows";
import type { ExampleTodoApiPluginRegistration } from "../../../plugins/server/api/example-todo/src/api";

export type RawrHostDeclarations = Readonly<{
  api: Readonly<{
    exampleTodo: ExampleTodoApiPluginRegistration;
  }>;
  workflows: Readonly<Record<string, never>>;
}>;

/**
 * @agents-style seam-law declaration -> host binding -> request/process materialization
 * @agents-style canonical host role seam
 *
 * Owns:
 * - composing app-selected API/workflow contributions into one role plan
 *
 * Must not own:
 * - request capability construction
 * - request context creation
 * - ORPC/OpenAPI/Inngest handler materialization
 * - route mounting
 *
 * Canonical:
 * - `createRawrHostRolePlan({ declarations })`
 *
 * Transitional:
 * - app-manifest intake is localized upstream in `host-composition.ts`
 *
 * Must stay strict:
 * - API registrations arrive as complete static contributions
 * - request capabilities enter only through host request context
 */

function collectRawrHqApiPlugins(input: { declarations: RawrHostDeclarations }) {
  const exampleTodo = input.declarations.api.exampleTodo;

  return [exampleTodo satisfies MaterializedApiPluginRegistration] as const;
}

function collectRawrHqWorkflowPlugins(input: { declarations: RawrHostDeclarations }) {
  void input;
  return [] as const satisfies readonly WorkflowPluginRegistration[];
}

export type RawrHostRolePlan = Readonly<{
  apiPlugins: readonly MaterializedApiPluginRegistration[];
  workflowPlugins: readonly WorkflowPluginRegistration[];
  api: ReturnType<typeof composeApiPlugins>;
  workflows: ReturnType<typeof composeWorkflowPlugins>;
}>;

/**
 * Converts static HQ app declarations into the role plan consumed by host
 * realization.
 */
export function createRawrHostRolePlan(input: {
  declarations: RawrHostDeclarations;
}): RawrHostRolePlan {
  const apiPlugins = collectRawrHqApiPlugins(input);
  const workflowPlugins = collectRawrHqWorkflowPlugins(input);

  return {
    apiPlugins,
    workflowPlugins,
    api: composeApiPlugins(apiPlugins),
    workflows: composeWorkflowPlugins(workflowPlugins),
  };
}
