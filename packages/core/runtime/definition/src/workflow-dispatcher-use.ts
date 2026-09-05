import type { ResourceRequirement, RuntimeResource } from "./resource";
import type {
  WorkflowAdmissionDefinition,
  WorkflowDispatcher,
  WorkflowDispatcherTarget,
  WorkflowEventSender,
} from "./workflow-admission";

const workflowDispatcherUseCarrier = Symbol("habitat.workflow-dispatcher-use.carrier");

export type WorkflowDispatcherClientRequirement = ResourceRequirement<
  RuntimeResource<string, WorkflowEventSender>
> & { readonly optional?: false };

export interface WorkflowDispatcherUseCarrier<
  TWorkflows extends
    readonly WorkflowAdmissionDefinition[] = readonly WorkflowAdmissionDefinition[],
  TClient extends WorkflowDispatcherClientRequirement = WorkflowDispatcherClientRequirement,
> {
  readonly plugin: WorkflowDispatcherTarget;
  readonly workflows: TWorkflows;
  readonly client: TClient;
}

export interface WorkflowDispatcherUse<
  TWorkflows extends
    readonly WorkflowAdmissionDefinition[] = readonly WorkflowAdmissionDefinition[],
  TClient extends WorkflowDispatcherClientRequirement = WorkflowDispatcherClientRequirement,
> {
  readonly kind: "workflow.dispatcher-use";
  readonly [workflowDispatcherUseCarrier]: WorkflowDispatcherUseCarrier<TWorkflows, TClient>;
}

export type WorkflowDispatcherUses = Readonly<Record<string, WorkflowDispatcherUse>>;

export type WorkflowDispatchers<TUses extends WorkflowDispatcherUses> = {
  readonly [TName in keyof TUses]: TUses[TName] extends WorkflowDispatcherUse<infer TWorkflows>
    ? WorkflowDispatcher<TWorkflows>
    : never;
};

export function useWorkflowDispatcher<
  const TPlugin extends WorkflowDispatcherTarget,
  const TWorkflows extends readonly [
    NoInfer<TPlugin>["workflows"][number],
    ...NoInfer<TPlugin>["workflows"][number][],
  ],
  const TClient extends WorkflowDispatcherClientRequirement,
>(
  plugin: TPlugin,
  input: { readonly workflows: TWorkflows; readonly client: TClient }
): WorkflowDispatcherUse<TWorkflows, TClient> {
  if (
    plugin.kind !== "plugin.definition" ||
    plugin.role !== "async" ||
    plugin.surface !== "async/workflow" ||
    !Array.isArray(plugin.workflows)
  )
    throw new TypeError("A workflow dispatcher requires an exact workflow plugin target.");
  if (!Array.isArray(input.workflows) || input.workflows.length === 0)
    throw new TypeError("A workflow dispatcher requires a nonempty workflow subset.");
  const ids = new Set<string>();
  for (const workflow of input.workflows) {
    if (workflow.kind !== "async.workflow" || !plugin.workflows.includes(workflow))
      throw new TypeError("A workflow dispatcher requires exact target workflow members.");
    if (ids.has(workflow.id))
      throw new TypeError("A workflow dispatcher cannot repeat a workflow.");
    ids.add(workflow.id);
  }
  if (
    input.client.resource.kind !== "runtime.resource" ||
    (input.client.optional !== undefined && input.client.optional !== false)
  )
    throw new TypeError("A workflow dispatcher requires a required client resource.");

  const carrier: WorkflowDispatcherUseCarrier<TWorkflows, TClient> = Object.freeze({
    plugin,
    workflows: Object.freeze([...input.workflows]) as unknown as TWorkflows,
    client: input.client,
  });
  const use: WorkflowDispatcherUse<TWorkflows, TClient> = {
    kind: "workflow.dispatcher-use",
    [workflowDispatcherUseCarrier]: carrier,
  };
  Object.defineProperty(use, workflowDispatcherUseCarrier, { enumerable: false });
  return Object.freeze(use);
}

export function readWorkflowDispatcherUse<
  TWorkflows extends readonly WorkflowAdmissionDefinition[],
  TClient extends WorkflowDispatcherClientRequirement,
>(
  use: WorkflowDispatcherUse<TWorkflows, TClient>
): WorkflowDispatcherUseCarrier<TWorkflows, TClient> | undefined {
  return use[workflowDispatcherUseCarrier];
}
