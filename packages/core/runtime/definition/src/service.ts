import { oc } from "@orpc/contract";
import { implement, os } from "@orpc/server";

import type { RuntimeSchema } from "../../schema/src/runtime-schema";
import type { RuntimeResource } from "./resource";

const createMiddleware: typeof os.middleware = os.middleware.bind(os);

export interface ResourceDependency<TResource extends RuntimeResource = RuntimeResource> {
  readonly kind: "service.dependency.resource";
  readonly resource: TResource;
}

export interface ServiceDependency<TService extends ServiceDefinition = ServiceDefinition> {
  readonly kind: "service.dependency.service";
  readonly service: TService;
}

export interface SemanticDependency {
  readonly kind: "service.dependency.semantic";
  readonly adapterId: string;
}

export type ServiceDependencyDeclaration =
  | ResourceDependency
  | ServiceDependency
  | SemanticDependency;

export const resourceDep = <const TResource extends RuntimeResource>(
  resource: TResource
): ResourceDependency<TResource> =>
  Object.freeze({ kind: "service.dependency.resource", resource });

export const serviceDep = <const TService extends ServiceDefinition>(
  service: TService
): ServiceDependency<TService> => Object.freeze({ kind: "service.dependency.service", service });

export const semanticDep = (adapterId: string): SemanticDependency =>
  Object.freeze({ kind: "service.dependency.semantic", adapterId });

export interface ServiceDefinition<
  TId extends string = string,
  TDependencies extends Readonly<Record<string, ServiceDependencyDeclaration>> = Readonly<
    Record<string, ServiceDependencyDeclaration>
  >,
  TScope = unknown,
  TConfig = unknown,
  TInvocation = unknown,
> {
  readonly kind: "service.definition";
  readonly id: TId;
  readonly deps: TDependencies;
  readonly scope?: RuntimeSchema<TScope>;
  readonly config?: RuntimeSchema<TConfig>;
  readonly invocation?: RuntimeSchema<TInvocation>;
  readonly metadataDefaults?: Readonly<Record<string, unknown>>;
  readonly baseline?: Readonly<Record<string, unknown>>;
  readonly oc: typeof oc;
  readonly createMiddleware: typeof createMiddleware;
  readonly createImplementer: typeof implement;
}

export function defineService<
  const TId extends string,
  const TDependencies extends Readonly<Record<string, ServiceDependencyDeclaration>>,
  TScope = unknown,
  TConfig = unknown,
  TInvocation = unknown,
>(
  input: Omit<
    ServiceDefinition<TId, TDependencies, TScope, TConfig, TInvocation>,
    "kind" | "oc" | "createMiddleware" | "createImplementer"
  >
): ServiceDefinition<TId, TDependencies, TScope, TConfig, TInvocation> {
  return Object.freeze({
    ...input,
    kind: "service.definition",
    deps: Object.freeze({ ...input.deps }),
    oc,
    createMiddleware,
    createImplementer: implement,
  });
}

export type ServiceOf<TDefinition extends ServiceDefinition> = TDefinition;

const serviceUseCarrier = Symbol("habitat.service-use.carrier");

interface ServiceUseCarrier<TContract> {
  readonly definition: ServiceDefinition;
  readonly contract: TContract;
}

export interface ServiceUse<TContract = unknown> {
  readonly kind: "service.use";
  readonly serviceId: string;
  readonly serviceInstance?: string;
  readonly [serviceUseCarrier]: ServiceUseCarrier<TContract>;
}

export type ServiceUses = Readonly<Record<string, ServiceUse<unknown>>>;

export type ServiceContractOf<TUse> = TUse extends ServiceUse<infer TContract> ? TContract : never;

export function useService<const TContract>(
  serviceDefinition: ServiceDefinition,
  options: {
    readonly contract: TContract;
    readonly instance?: string;
  }
): ServiceUse<TContract> {
  const serviceUse = {
    kind: "service.use" as const,
    serviceId: serviceDefinition.id,
    ...(options.instance === undefined ? {} : { serviceInstance: options.instance }),
  };

  Object.defineProperty(serviceUse, serviceUseCarrier, {
    configurable: false,
    enumerable: false,
    value: Object.freeze({ definition: serviceDefinition, contract: options.contract }),
    writable: false,
  });

  return Object.freeze(serviceUse) as ServiceUse<TContract>;
}

export function readServiceUse<TContract>(
  serviceUse: ServiceUse<TContract>
): ServiceUseCarrier<TContract> {
  return serviceUse[serviceUseCarrier];
}
