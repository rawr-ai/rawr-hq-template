import type { EffectBody } from "../sdk/effect";
import type { AppRole } from "../sdk/runtime/resources";

export type ExecutionBoundaryKind =
  | "service.procedure"
  | "plugin.server-api"
  | "plugin.server-internal"
  | "plugin.async-step"
  | "plugin.cli-command"
  | "plugin.web-surface"
  | "plugin.agent-tool"
  | "plugin.desktop-background";

export type ProviderEffectBoundaryKind =
  | "provider.acquire"
  | "provider.release";

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

export type ExecutionDescriptorIdentityInput =
  DistributiveOmit<ExecutionDescriptorRef, "kind" | "executionId">;

export interface EffectBoundaryContext {
  readonly traceId: string;
  readonly requestId?: string;
  readonly actorId?: string;
}

export interface BoundaryTelemetry {
  event(name: string, attributes?: Record<string, string | number | boolean>): void;
}

const RUNTIME_RESOURCE_ACCESS: unique symbol = Symbol("runtime.resource-access");

export interface RuntimeResourceAccess {
  readonly kind: "runtime.resource-access";
  readonly [RUNTIME_RESOURCE_ACCESS]: true;
}

export interface RuntimeAccess {
  readonly kind: "runtime.access";
  readonly resources: ReadonlyMap<string, unknown>;
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

export interface RuntimeDiagnostic {
  readonly code: string;
  readonly message: string;
}

export interface ExecutionDescriptor<
  TInput = unknown,
  TOutput = unknown,
  TError = unknown,
  TContext = unknown,
  TRequirements = unknown,
> {
  readonly kind: "execution.descriptor";
  readonly ref: ExecutionDescriptorRef;
  readonly run: EffectBody<TContext, TOutput, TError, TRequirements>;
}

export interface ExecutionDescriptorTable {
  readonly kind: "execution.descriptor-table";
  get(ref: ExecutionDescriptorRef): ExecutionDescriptor<any, any, any, any, any>;
  entries(): Iterable<ExecutionDescriptorTableEntry>;
}

export interface ExecutionDescriptorTableEntry {
  readonly ref: ExecutionDescriptorRef;
  readonly descriptor: ExecutionDescriptor<any, any, any, any, any>;
}

export interface CompiledExecutionPlan {
  readonly kind: "compiled.execution-plan";
  readonly ref: ExecutionDescriptorRef;
  readonly policy?: {
    readonly timeoutMs?: number;
  };
}

export interface CompiledExecutableBoundary {
  readonly kind: "compiled.executable-boundary";
  readonly ref: ExecutionDescriptorRef;
  readonly descriptor: ExecutionDescriptor<any, any, any, any, any>;
  readonly plan: CompiledExecutionPlan;
}

export interface ExecutionRegistry {
  readonly kind: "execution.registry";
  get(ref: ExecutionDescriptorRef): CompiledExecutableBoundary;
}

export interface ServiceBindingPlan {
  readonly kind: "service.binding-plan";
  readonly serviceId: string;
  readonly role: AppRole;
}

export interface SurfaceRuntimePlan {
  readonly kind: "surface.runtime-plan";
  readonly role: AppRole;
  readonly surface: string;
  readonly executableBoundaryRefs: readonly ExecutionDescriptorRef[];
}

export interface WorkflowDispatcherOperationDescriptor {
  readonly operation: "dispatch" | "status" | "cancel";
  readonly workflowId: string;
}

export interface WorkflowDispatcherDescriptor {
  readonly kind: "workflow.dispatcher-descriptor";
  readonly descriptorId: string;
  readonly appId: string;
  readonly role: AppRole;
  readonly surface: string;
  readonly capability: string;
  readonly workflowRefs: readonly { readonly workflowId: string }[];
  readonly operations: readonly WorkflowDispatcherOperationDescriptor[];
  readonly diagnostics: readonly RuntimeDiagnostic[];
}

export interface PortableRuntimePlanArtifact {
  readonly kind: "portable.runtime-plan-artifact";
  readonly appId: string;
  readonly executionDescriptorRefs: readonly ExecutionDescriptorRef[];
  readonly serviceBindingPlans: readonly ServiceBindingPlan[];
  readonly surfaceRuntimePlans: readonly SurfaceRuntimePlan[];
  readonly workflowDispatcherDescriptors: readonly WorkflowDispatcherDescriptor[];
  readonly diagnostics: readonly RuntimeDiagnostic[];
}

export interface CompiledExecutionRegistryInput {
  readonly kind: "compiled.execution-registry-input";
  readonly executionPlans: readonly CompiledExecutionPlan[];
  readonly descriptorTable: ExecutionDescriptorTable;
}

export interface CompiledProcessPlan {
  readonly kind: "compiled.process-plan";
  readonly appId: string;
  readonly executionPlans: readonly CompiledExecutionPlan[];
}

export interface BootResourceModule {
  readonly kind: "boot.resource-module";
  readonly resourceId: string;
  readonly providerId: string;
}

export interface RuntimeCatalog {
  readonly kind: "runtime.catalog";
  readonly descriptors: readonly {
    readonly id: string;
    readonly kind: string;
  }[];
}

export interface IdentityPolicy {
  executionDescriptorId(input: ExecutionDescriptorIdentityInput): string;
}
