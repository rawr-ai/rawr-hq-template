import type { EffectBody } from "../sdk/effect";
import type { RuntimeProfile } from "../sdk/runtime/profiles";
import type { AppRole, ResourceLifetime } from "../sdk/runtime/resources";

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

/**
 * Portable identity for an executable boundary. A ref may cross derivation,
 * compilation, adapter, and deployment handoff layers; executable bodies and
 * descriptor tables must stay behind runtime-owned boundaries.
 */
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

export interface RuntimeTelemetry {
  event(name: string, attributes?: Record<string, string | number | boolean>): void;
}

const RUNTIME_RESOURCE_ACCESS: unique symbol = Symbol("runtime.resource-access");

/**
 * Branded placeholder for runtime-owned resource access. The current lab checks
 * that callers do not receive raw handles by type accident, but final public
 * RuntimeResourceAccess methods remain an architecture decision.
 */
export interface RuntimeResourceAccess {
  readonly kind: "runtime.resource-access";
  readonly [RUNTIME_RESOURCE_ACCESS]: true;
}

export interface RuntimeTopologyRecord {
  readonly kind: string;
  readonly [key: string]: unknown;
}

export interface ProcessRuntimeAccess {
  readonly appId: string;
  readonly processId: string;
  readonly entrypointId: string;
  readonly profileId: string;
  readonly roles: readonly AppRole[];
  resource<TResource extends { readonly id: string }>(
    resource: TResource,
    input?: { readonly instance?: string },
  ): unknown;
  optionalResource<TResource extends { readonly id: string }>(
    resource: TResource,
    input?: { readonly instance?: string },
  ): unknown | undefined;
  telemetry(): RuntimeTelemetry;
  emitTopology(record: RuntimeTopologyRecord): void;
  emitDiagnostic(diagnostic: RuntimeDiagnostic): void;
}

export interface RoleSurfaceIdentity {
  readonly role: AppRole;
  readonly surface: string;
  readonly capability: string;
  readonly instance?: string;
}

/**
 * Process/role/surface access facades model authority narrowing. They are not
 * final public SDK law; they preserve the intended direction that host adapters
 * and services receive scoped access instead of global runtime internals.
 */
export interface RoleRuntimeAccess {
  readonly role: AppRole;
  readonly process: ProcessRuntimeAccess;
  readonly selectedSurfaces: readonly RoleSurfaceIdentity[];
  resource<TResource extends { readonly id: string }>(
    resource: TResource,
    input?: { readonly instance?: string },
  ): unknown;
  optionalResource<TResource extends { readonly id: string }>(
    resource: TResource,
    input?: { readonly instance?: string },
  ): unknown | undefined;
  forSurface(input: {
    readonly surface: string;
    readonly capability: string;
    readonly instance?: string;
  }): SurfaceRuntimeAccess;
}

export interface SurfaceRuntimeAccess {
  readonly role: AppRole;
  readonly surface: string;
  readonly capability: string;
  readonly instance?: string;
  readonly roleAccess: RoleRuntimeAccess;
}

export interface RuntimeAccess {
  readonly kind: "runtime.access";
  readonly process: ProcessRuntimeAccess;
  readonly roles: ReadonlyMap<AppRole, RoleRuntimeAccess>;
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

/**
 * Runtime-owned executable descriptor. Descriptors may appear in the local table
 * input and registry, but they are intentionally excluded from portable plan
 * artifacts and deployment handoff records.
 */
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
  readonly serviceInstance?: string;
  readonly role: AppRole;
  readonly surface: string;
  readonly capability: string;
  readonly dependencyInstances: readonly string[];
  readonly scopeHash: string;
  readonly configHash: string;
}

export interface SurfaceRuntimePlan {
  readonly kind: "surface.runtime-plan";
  readonly role: AppRole;
  readonly surface: string;
  readonly executableBoundaryRefs: readonly ExecutionDescriptorRef[];
}

export type ServerRouteBoundaryKind = "plugin.server-api" | "plugin.server-internal";

/** Declares that route metadata can be read during spine derivation without mounting a server adapter, importing host-only modules, or executing route bodies. */
export type ServerRouteImportSafety = "cold-declaration";

export interface ServerRouteDeclaration {
  readonly kind: "server.route-declaration";
  readonly boundary: ServerRouteBoundaryKind;
  readonly role: "server";
  readonly surface: string;
  readonly capability: string;
  readonly routePath: readonly string[];
  readonly executionId?: string;
  readonly importSafety: ServerRouteImportSafety;
  readonly descriptor?: ExecutionDescriptor<any, any, any, any, any>;
  readonly policy?: CompiledExecutionPlan["policy"];
}

/**
 * Lab-only route discovery boundary. `deriveRoutes()` may run during derivation,
 * but it must only produce cold declarations; request handling, adapter mounting,
 * and Effect execution remain outside this phase.
 */
export interface ServerRouteDerivationInput {
  readonly kind: "server.route-derivation-input";
  readonly routeFactoryId: string;
  deriveRoutes(): readonly ServerRouteDeclaration[];
}

/**
 * Portable server-route inventory emitted after validation. This records route identity
 * and diagnostics for downstream evidence/review; it deliberately does not choose HTTP
 * method, auth policy, middleware order, adapter mount shape, or deployment wiring.
 */
export interface ServerRouteDescriptor {
  readonly kind: "server.route-descriptor";
  readonly appId: string;
  readonly executionId: string;
  readonly boundary: ServerRouteBoundaryKind;
  readonly role: "server";
  readonly surface: string;
  readonly capability: string;
  readonly routePath: readonly string[];
  readonly importSafety: ServerRouteImportSafety;
  readonly diagnostics: readonly RuntimeDiagnostic[];
}

export interface WorkflowDispatcherOperationDescriptor {
  readonly operation: "dispatch" | "status" | "cancel";
  readonly workflowId: string;
}

/**
 * Dispatcher inventory records which workflow operations a dispatcher claims.
 * It does not grant dispatcher access, settle the public declaration syntax, or
 * imply durable workflow host behavior.
 */
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
  readonly serverRouteDescriptors: readonly ServerRouteDescriptor[];
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
  readonly lifetime: ResourceLifetime;
  readonly role?: AppRole;
  readonly instance?: string;
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

export type RuntimeExecutionDerivationIdentityInput =
  DistributiveOmit<ExecutionDescriptorRef, "kind" | "executionId" | "appId">;

export type RuntimeExecutionDerivationInput =
  RuntimeExecutionDerivationIdentityInput & {
    readonly kind: "runtime.execution-derivation-input";
    readonly executionId?: string;
    readonly descriptor?: ExecutionDescriptor<any, any, any, any, any>;
    readonly policy?: CompiledExecutionPlan["policy"];
  };

export interface ServiceBindingDerivationInput {
  readonly kind: "service.binding-derivation-input";
  readonly serviceId: string;
  readonly serviceInstance?: string;
  readonly role: AppRole;
  readonly surface: string;
  readonly capability: string;
  readonly dependencyInstances?: readonly string[];
  readonly scopeHash: string;
  readonly configHash: string;
}

export interface WorkflowDispatcherDerivationInput {
  readonly kind: "workflow.dispatcher-derivation-input";
  readonly descriptorId?: string;
  readonly role: AppRole;
  readonly surface: string;
  readonly capability: string;
  readonly workflowIds: readonly string[];
  readonly operations?: readonly WorkflowDispatcherOperationDescriptor[];
  readonly diagnostics?: readonly RuntimeDiagnostic[];
}

export interface RuntimeSpineDerivationInput {
  readonly kind: "runtime.spine-derivation-input";
  readonly appId: string;
  readonly profile?: RuntimeProfile;
  readonly identityPolicy?: IdentityPolicy;
  readonly executions: readonly RuntimeExecutionDerivationInput[];
  readonly serviceBindings?: readonly ServiceBindingDerivationInput[];
  readonly serverRoutes?: readonly ServerRouteDerivationInput[];
  readonly dispatchers?: readonly WorkflowDispatcherDerivationInput[];
}

export interface ExecutionDescriptorTableInput {
  readonly kind: "execution.descriptor-table-input";
  readonly entries: readonly ExecutionDescriptorTableEntry[];
}

export interface ExecutionPlanSeed {
  readonly kind: "execution.plan-seed";
  readonly ref: ExecutionDescriptorRef;
  readonly policy?: CompiledExecutionPlan["policy"];
}

export interface ProviderDependencyGraphNode {
  readonly kind: "provider.dependency-node";
  readonly resourceId: string;
  readonly providerId: string;
  readonly lifetime: ResourceLifetime;
  readonly role?: AppRole;
  readonly instance?: string;
}

export interface ProviderDependencyGraphEdge {
  readonly kind: "provider.dependency-edge";
  readonly fromProviderKey: ProviderDependencyGraphNode;
  readonly fromProviderId: string;
  readonly toResourceId: string;
  readonly optional: boolean;
  readonly reason: string;
  readonly matchedProviderId?: string;
  readonly matchedProviderKey?: ProviderDependencyGraphNode;
}

export interface ProviderDependencyGraph {
  readonly kind: "provider.dependency-graph";
  readonly profileId: string;
  readonly nodes: readonly ProviderDependencyGraphNode[];
  readonly edges: readonly ProviderDependencyGraphEdge[];
  readonly diagnostics: readonly RuntimeDiagnostic[];
}

/**
 * Normalized graph is the lab's authoring-inventory snapshot after derivation.
 * It is useful for review and migration planning, but it is not an accepted
 * production SDK extraction result.
 */
export interface NormalizedAuthoringGraph {
  readonly kind: "normalized.authoring-graph";
  readonly appId: string;
  readonly executionDescriptorRefs: readonly ExecutionDescriptorRef[];
  readonly serviceBindingPlans: readonly ServiceBindingPlan[];
  readonly surfaceRuntimePlans: readonly SurfaceRuntimePlan[];
  readonly serverRouteDescriptors: readonly ServerRouteDescriptor[];
  readonly workflowDispatcherDescriptors: readonly WorkflowDispatcherDescriptor[];
  readonly diagnostics: readonly RuntimeDiagnostic[];
}

export interface RuntimeSpineDerivation {
  readonly kind: "runtime.spine-derivation";
  readonly appId: string;
  readonly profile?: RuntimeProfile;
  readonly normalizedGraph: NormalizedAuthoringGraph;
  readonly executionDescriptorRefs: readonly ExecutionDescriptorRef[];
  readonly descriptorTableInput: ExecutionDescriptorTableInput;
  readonly executionPlanSeeds: readonly ExecutionPlanSeed[];
  readonly serviceBindingPlans: readonly ServiceBindingPlan[];
  readonly surfaceRuntimePlans: readonly SurfaceRuntimePlan[];
  readonly serverRouteDescriptors: readonly ServerRouteDescriptor[];
  readonly workflowDispatcherDescriptors: readonly WorkflowDispatcherDescriptor[];
  readonly portableArtifact: PortableRuntimePlanArtifact;
  readonly diagnostics: readonly RuntimeDiagnostic[];
}

export type RuntimeHarnessKind =
  | "server"
  | "async"
  | "cli"
  | "web"
  | "agent"
  | "desktop";

export interface RuntimeHarnessPlanPlaceholder {
  readonly kind: "harness.plan-placeholder";
  readonly harness: RuntimeHarnessKind;
  readonly role: AppRole;
  readonly surface: string;
  readonly executableBoundaryRefs: readonly ExecutionDescriptorRef[];
  readonly diagnostics: readonly RuntimeDiagnostic[];
}

/**
 * Lab-only payload handed to the server adapter lowering shim. It records that
 * a server route still points at the same executable boundary after derivation;
 * it does not choose HTTP mounting, middleware, auth, or public route DX.
 */
export interface ServerAdapterCallbackPayload {
  readonly kind: "adapter.server-callback-payload";
  readonly ref: Extract<
    ExecutionDescriptorRef,
    { boundary: "plugin.server-api" | "plugin.server-internal" }
  >;
  readonly routeDescriptor: ServerRouteDescriptor;
  readonly diagnostics: readonly RuntimeDiagnostic[];
}

/**
 * Lab-only payload handed to the async adapter bridge. It preserves the async
 * owner and step identity that the runtime may invoke later; durable workflow
 * scheduling, retries, leases, and status semantics are intentionally out of
 * scope for this lab layer.
 */
export interface AsyncStepBridgePayload {
  readonly kind: "adapter.async-step-bridge-payload";
  readonly ref: Extract<ExecutionDescriptorRef, { boundary: "plugin.async-step" }>;
  readonly owner: {
    readonly kind: "workflow" | "schedule" | "consumer";
    readonly id: string;
  };
  readonly stepId: string;
  readonly diagnostics: readonly RuntimeDiagnostic[];
}

export type RuntimeAdapterLoweringPayload =
  | ServerAdapterCallbackPayload
  | AsyncStepBridgePayload;

/**
 * Pre-harness adapter lowering output. The compiler can check which adapter
 * payloads are well-formed through tests before any real host is mounted, while
 * leaving the eventual harness integration contract deliberately undecided.
 */
export interface RuntimeAdapterLoweringPlan {
  readonly kind: "adapter.lowering-plan";
  readonly payloads: readonly RuntimeAdapterLoweringPayload[];
  readonly diagnostics: readonly RuntimeDiagnostic[];
}

export interface RuntimeBootgraphInputPlaceholder {
  readonly kind: "bootgraph.input-placeholder";
  readonly appId: string;
  readonly resourceModules: readonly BootResourceModule[];
  readonly providerDependencyGraph?: ProviderDependencyGraph;
  readonly diagnostics: readonly RuntimeDiagnostic[];
}

/**
 * Compilation is a contained runtime-shaped bundle, not a production runtime
 * plan. It preserves the seams needed by later bootgraph, provider lowering,
 * adapter mounting, and deployment workstreams without resolving them here.
 */
export interface RuntimeSpineCompilation {
  readonly kind: "runtime.spine-compilation";
  readonly appId: string;
  readonly portableArtifact: PortableRuntimePlanArtifact;
  readonly compiledProcessPlan: CompiledProcessPlan;
  readonly registryInput: CompiledExecutionRegistryInput;
  readonly providerDependencyGraph?: ProviderDependencyGraph;
  readonly harnessPlans: readonly RuntimeHarnessPlanPlaceholder[];
  readonly adapterLoweringPlan: RuntimeAdapterLoweringPlan;
  readonly bootgraphInput: RuntimeBootgraphInputPlaceholder;
  readonly diagnostics: readonly RuntimeDiagnostic[];
}
