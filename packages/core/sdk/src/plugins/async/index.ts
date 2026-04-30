import {
  useService,
  type ServiceDefinition,
  type ServiceUse,
  type ServiceUses,
} from "../../service";

export { useService };
export type { ServiceDefinition, ServiceUse, ServiceUses };

export interface WorkflowDefinition<TContext = unknown> {
  readonly kind: "async.workflow";
  readonly id: string;
  run(context: TContext): Promise<unknown> | unknown;
}

export interface AsyncTriggerDefinition {
  readonly id: string;
  readonly cron?: string;
  readonly event?: string;
}

export interface AsyncPluginInput<TServices extends ServiceUses = ServiceUses> {
  readonly capability: string;
  readonly services?: TServices;
}

export interface AsyncWorkflowPluginInput<TServices extends ServiceUses = ServiceUses>
  extends AsyncPluginInput<TServices> {
  readonly workflows: readonly WorkflowDefinition[];
}

export interface AsyncSchedulePluginInput<TServices extends ServiceUses = ServiceUses>
  extends AsyncPluginInput<TServices> {
  readonly schedules: readonly AsyncTriggerDefinition[];
}

export interface AsyncConsumerPluginInput<TServices extends ServiceUses = ServiceUses>
  extends AsyncPluginInput<TServices> {
  readonly consumers: readonly AsyncTriggerDefinition[];
}

export interface AsyncPluginDefinition<
  TKind extends "workflow" | "schedule" | "consumer",
  TServices extends ServiceUses = ServiceUses,
> {
  readonly kind: `plugin.async-${TKind}`;
  readonly capability: string;
  readonly id: string;
  readonly services: TServices;
  readonly workflows?: readonly WorkflowDefinition[];
  readonly schedules?: readonly AsyncTriggerDefinition[];
  readonly consumers?: readonly AsyncTriggerDefinition[];
  readonly importSafety: "cold-declaration";
}

interface AsyncPluginBuilder<TKind extends "workflow" | "schedule" | "consumer", TInput extends AsyncPluginInput> {
  <const TActualInput extends TInput>(input: TActualInput): AsyncPluginDefinition<
    TKind,
    TActualInput["services"] extends ServiceUses ? TActualInput["services"] : {}
  >;
  factory(): <const TActualInput extends TInput>(input: TActualInput) => AsyncPluginDefinition<
    TKind,
    TActualInput["services"] extends ServiceUses ? TActualInput["services"] : {}
  >;
}

function createAsyncPluginBuilder<TKind extends "workflow" | "schedule" | "consumer", TInput extends AsyncPluginInput>(
  kind: TKind,
): AsyncPluginBuilder<TKind, TInput> {
  const builder = ((input: AsyncPluginInput) => ({
    kind: `plugin.async-${kind}`,
    capability: input.capability,
    id: `async.${kind}.${input.capability}`,
    services: input.services ?? {},
    workflows: "workflows" in input ? input.workflows : undefined,
    schedules: "schedules" in input ? input.schedules : undefined,
    consumers: "consumers" in input ? input.consumers : undefined,
    importSafety: "cold-declaration",
  })) as AsyncPluginBuilder<TKind, TInput>;

  builder.factory = () => builder;
  return builder;
}

export function defineWorkflow<const TDefinition extends Omit<WorkflowDefinition, "kind">>(
  definition: TDefinition,
): TDefinition & { readonly kind: "async.workflow" } {
  return {
    kind: "async.workflow",
    ...definition,
  };
}

export const defineAsyncWorkflowPlugin =
  createAsyncPluginBuilder<"workflow", AsyncWorkflowPluginInput>("workflow");
export const defineAsyncSchedulePlugin =
  createAsyncPluginBuilder<"schedule", AsyncSchedulePluginInput>("schedule");
export const defineAsyncConsumerPlugin =
  createAsyncPluginBuilder<"consumer", AsyncConsumerPluginInput>("consumer");
