import type { EffectBody } from "../effect";
import type { AppRole } from "../runtime/resources";

export type ExecutionBoundaryKind =
  | "service.procedure"
  | "plugin.server-api"
  | "plugin.server-internal"
  | "plugin.async-step"
  | "plugin.cli-command"
  | "plugin.web-surface"
  | "plugin.agent-tool"
  | "plugin.desktop-background";

export interface EffectBoundaryContext {
  readonly traceId: string;
  readonly requestId?: string;
  readonly actorId?: string;
}

export interface BoundaryTelemetry {
  event(name: string, attributes?: Record<string, string | number | boolean>): void;
}

export interface RuntimeTelemetry {
  event(name: string, attributes?: Record<string, string | number | boolean>): void;
}

export interface RuntimeDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly attributes?: Record<string, string | number | boolean>;
}

export interface RuntimeResourceMetadata {
  readonly resourceId: string;
  readonly instance?: string;
  readonly available: boolean;
}

export interface RuntimeResourceAccess {
  readonly kind: "runtime.resource-access";
  get<TValue>(
    resource: { readonly id: string },
    input?: { readonly instance?: string },
  ): TValue;
  getOptional<TValue>(
    resource: { readonly id: string },
    input?: { readonly instance?: string },
  ): TValue | undefined;
  metadata(resource?: { readonly id: string }): readonly RuntimeResourceMetadata[];
}

export interface WorkflowDispatcher {
  readonly kind: "workflow.dispatcher";
  dispatch(input: { readonly workflowId: string; readonly payload: unknown }): Promise<{
    readonly runId: string;
  }>;
}

export interface PublicServerRequestContext {
  requireActor(): Promise<{ readonly id: string }>;
}

export interface ExecutionDescriptorRefBase {
  readonly kind: "execution.descriptor-ref";
  readonly boundary: ExecutionBoundaryKind;
  readonly executionId: string;
  readonly appId: string;
  readonly role: AppRole;
  readonly surface: string;
  readonly capability: string;
}

export type AsyncExecutionOwnerIdentity =
  | {
      readonly workflowId: string;
      readonly scheduleId?: never;
      readonly consumerId?: never;
    }
  | {
      readonly workflowId?: never;
      readonly scheduleId: string;
      readonly consumerId?: never;
    }
  | {
      readonly workflowId?: never;
      readonly scheduleId?: never;
      readonly consumerId: string;
    };

export type ExecutionDescriptorRef =
  | (ExecutionDescriptorRefBase & {
      readonly boundary: "service.procedure";
      readonly serviceId: string;
      readonly procedurePath: readonly string[];
    })
  | (ExecutionDescriptorRefBase & {
      readonly boundary: "plugin.server-api" | "plugin.server-internal";
      readonly routePath: readonly string[];
    })
  | (ExecutionDescriptorRefBase & {
      readonly boundary: "plugin.async-step";
      readonly stepId: string;
    } & AsyncExecutionOwnerIdentity)
  | (ExecutionDescriptorRefBase & {
      readonly boundary: "plugin.cli-command";
      readonly commandId: string;
    })
  | (ExecutionDescriptorRefBase & {
      readonly boundary: "plugin.web-surface";
      readonly routePath: readonly string[];
    })
  | (ExecutionDescriptorRefBase & {
      readonly boundary: "plugin.agent-tool";
      readonly toolId: string;
    })
  | (ExecutionDescriptorRefBase & {
      readonly boundary: "plugin.desktop-background";
      readonly backgroundId: string;
    });

export type DistributiveOmit<TValue, TKey extends PropertyKey> =
  TValue extends unknown ? Omit<TValue, TKey> : never;

export type ExecutionDescriptorRefInput =
  DistributiveOmit<ExecutionDescriptorRef, "kind">;

export function defineExecutionDescriptorRef(
  input: ExecutionDescriptorRefInput,
): ExecutionDescriptorRef {
  return {
    kind: "execution.descriptor-ref",
    ...input,
  } as ExecutionDescriptorRef;
}

export interface ExecutionDescriptor<
  TInput = unknown,
  TOutput = unknown,
  TError = unknown,
  TContext = unknown,
  TRequirements = unknown,
> {
  readonly kind: "execution.descriptor";
  readonly ref?: ExecutionDescriptorRef;
  readonly run: EffectBody<TContext, TOutput, TError, TRequirements>;
}

export function defineExecutionDescriptor<
  TInput,
  TOutput,
  TError = never,
  TContext = unknown,
  TRequirements = never,
>(
  input: Omit<
    ExecutionDescriptor<TInput, TOutput, TError, TContext, TRequirements>,
    "kind"
  >,
): ExecutionDescriptor<TInput, TOutput, TError, TContext, TRequirements> {
  return {
    kind: "execution.descriptor",
    ...input,
  };
}
