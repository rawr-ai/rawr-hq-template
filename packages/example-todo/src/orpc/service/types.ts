import type {
  DeclaredContext,
  ExecutionContext,
  ORPCInitialContext,
  RequiredExtensionExecutionContext,
} from "../context/types";
import type {
  BaseMetadata,
  ServiceDepsOf,
  ServiceMetadataOf,
} from "../baseline/types";

/**
 * Canonical service declaration shape for `defineService(...)`.
 *
 * @remarks
 * Author-facing service definitions should declare the service through three
 * semantic categories:
 * - `initialContext`: construction-time context supplied when the client is created
 * - `invocationContext`: per-call context supplied at procedure invocation time
 * - `metadata`: static procedure metadata authored by the service
 *
 * The SDK derives the composed `Deps`, `Metadata`, and execution-context
 * projections internally from those grouped categories.
 */
type ServiceInitialContextDeclaration = Pick<
  DeclaredContext<object, object, object>,
  "deps" | "scope" | "config"
>;

export type ServiceDeclaration = {
  initialContext: ServiceInitialContextDeclaration;
  invocationContext: object;
  metadata: object;
};

/**
 * Compose the canonical service boundary types from one declaration shape.
 *
 * @remarks
 * This helper is the safe way to derive a service's composed `Deps`,
 * `Metadata`, and context projections from one declaration block while still
 * preserving the baseline helper seam internally.
 *
 * Do not replace this with casts or ad hoc widened object types. If a future
 * helper cannot preserve `ServiceDepsOf`, `ServiceMetadataOf`, and the
 * execution-context projections, the helper is wrong and should be redesigned
 * rather than patched over with silent typing workarounds.
 */
export type ServiceTypesOf<
  T extends ServiceDeclaration,
> = {
  Deps: ServiceDepsOf<T["initialContext"]["deps"]>;
  Scope: T["initialContext"]["scope"];
  Config: T["initialContext"]["config"];
  Invocation: T["invocationContext"];
  Metadata: ServiceMetadataOf<T["metadata"]>;
  DeclaredContext: DeclaredContext<
    ServiceDepsOf<T["initialContext"]["deps"]>,
    T["initialContext"]["scope"],
    T["initialContext"]["config"]
  >;
  ORPCInitialContext: ORPCInitialContext<
    ServiceDepsOf<T["initialContext"]["deps"]>,
    T["initialContext"]["scope"],
    T["initialContext"]["config"],
    T["invocationContext"]
  >;
  ExecutionContext: ExecutionContext<
    ServiceDepsOf<T["initialContext"]["deps"]>,
    T["initialContext"]["scope"],
    T["initialContext"]["config"],
    T["invocationContext"]
  >;
  RequiredExtensionExecutionContext: RequiredExtensionExecutionContext<
    ServiceDepsOf<T["initialContext"]["deps"]>,
    T["initialContext"]["scope"],
    T["initialContext"]["config"],
    T["invocationContext"]
  >;
};

/**
 * Internal canonical service-type shape used by SDK helpers.
 *
 * @remarks
 * Author-facing code should prefer `defineService<{ ... }>(...)` plus
 * `ServiceOf<typeof service>` as the primary seam. Projection helpers below are
 * for SDK internals; they should not become the normal authoring pattern.
 */
export type AnyService = ServiceTypesOf<ServiceDeclaration>;

export type ServiceDepsFrom<TService extends AnyService> = TService["Deps"];
export type ServiceScopeFrom<TService extends AnyService> = TService["Scope"];
export type ServiceConfigFrom<TService extends AnyService> = TService["Config"];
export type ServiceInvocationFrom<TService extends AnyService> = TService["Invocation"];
export type ServiceMetadataFrom<TService extends AnyService> = TService["Metadata"];
export type ServiceDeclaredContextFrom<TService extends AnyService> = TService["DeclaredContext"];
export type ServiceORPCInitialContextFrom<TService extends AnyService> = TService["ORPCInitialContext"];
export type ServiceExecutionContextFrom<TService extends AnyService> = TService["ExecutionContext"];
export type ServiceRequiredExtensionExecutionContextFrom<TService extends AnyService> =
  TService["RequiredExtensionExecutionContext"];

export type { BaseMetadata };
