import type { RuntimeSchema } from "./schema";

/** Admission retains only cold event facts, not the native execution context or step APIs. */
export interface WorkflowAdmissionDefinition<TId extends string = string, TInput = unknown> {
  readonly kind: "async.workflow";
  readonly id: TId;
  readonly eventName: string;
  readonly inputSchema: RuntimeSchema<TInput>;
}

export interface WorkflowDispatcherTarget {
  readonly kind: "plugin.definition";
  readonly id: string;
  readonly role: "async";
  readonly surface: "async/workflow";
  readonly capability: string;
  readonly instance?: string;
  readonly workflows: readonly WorkflowAdmissionDefinition[];
}

/** The native send capability consumed by admission; this does not wrap or construct a client. */
export interface WorkflowEventSender {
  send(event: { readonly name: string; readonly data: unknown; readonly id?: string }): Promise<{
    readonly ids: readonly string[];
  }>;
}

export type WorkflowAdmissionPayload<TWorkflow extends WorkflowAdmissionDefinition> =
  TWorkflow extends WorkflowAdmissionDefinition<string, infer TInput> ? TInput : never;

export interface WorkflowDispatchResult {
  readonly eventIds: readonly string[];
}

export interface WorkflowDispatchOptions {
  readonly id?: string;
}

export interface WorkflowDispatcher<
  TWorkflows extends
    readonly WorkflowAdmissionDefinition[] = readonly WorkflowAdmissionDefinition[],
> {
  send<const TWorkflow extends TWorkflows[number]>(
    workflow: TWorkflow,
    payload: NoInfer<WorkflowAdmissionPayload<TWorkflow>>,
    options?: WorkflowDispatchOptions
  ): Promise<WorkflowDispatchResult>;
}
