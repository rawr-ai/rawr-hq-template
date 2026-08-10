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

interface RuntimeConfigRefInput {
  readonly kind: "runtime.config";
  readonly key: string;
}

interface ServiceDependencyBindingInput {
  readonly instance?: string;
  readonly scope?: RuntimeConfigRefInput;
  readonly config?: RuntimeConfigRefInput;
  readonly dependencies?: Readonly<Record<string, ServiceDependencyBindingInput>>;
}

interface ServiceUseBindingInput {
  readonly scope?: RuntimeConfigRefInput;
  readonly config?: RuntimeConfigRefInput;
  readonly dependencies?: Readonly<Record<string, ServiceDependencyBindingInput>>;
}

interface ServiceUseCarrier<TContract> {
  readonly definition: ServiceDefinition;
  readonly contract: TContract;
  readonly binding?: ServiceUseBindingInput;
}

export interface ServiceUse<TContract = unknown> {
  readonly kind: "service.use";
  readonly serviceId: string;
  readonly serviceInstance?: string;
  readonly [serviceUseCarrier]: ServiceUseCarrier<TContract>;
}

export type ServiceUses = Readonly<Record<string, ServiceUse<unknown>>>;

export type ServiceContractOf<TUse> = TUse extends ServiceUse<infer TContract> ? TContract : never;

const bindingKeys = new Set(["scope", "config", "dependencies"]);
const dependencyBindingKeys = new Set(["instance", "scope", "config", "dependencies"]);
const runtimeConfigRefKeys = new Set(["kind", "key"]);

function assertPlainRecord(
  value: unknown,
  label: string
): asserts value is Record<PropertyKey, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be a plain object.`);
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${label} must be a plain object.`);
  }
}

function assertOnlyKeys(
  value: Record<PropertyKey, unknown>,
  keys: ReadonlySet<string>,
  label: string
): void {
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !keys.has(key)) {
      throw new TypeError(`${label} contains an unknown field.`);
    }
  }
}

function copyRuntimeConfigRef(value: unknown, label: string): RuntimeConfigRefInput {
  assertPlainRecord(value, label);
  assertOnlyKeys(value, runtimeConfigRefKeys, label);

  if (value.kind !== "runtime.config" || typeof value.key !== "string" || value.key.length === 0) {
    throw new TypeError(`${label} must contain a nonempty runtime config key.`);
  }

  return Object.freeze({ kind: "runtime.config", key: value.key });
}

function copyDependencyBindings(
  value: unknown,
  serviceDefinition: ServiceDefinition,
  active: WeakSet<object>
): Readonly<Record<string, ServiceDependencyBindingInput>> {
  assertPlainRecord(value, "Service dependency bindings");

  if (active.has(value)) {
    throw new TypeError("Service dependency bindings must form a tree.");
  }

  active.add(value);
  try {
    const bindings: [string, ServiceDependencyBindingInput][] = [];

    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") {
        throw new TypeError("Service dependency binding keys must be strings.");
      }
      if (!Object.hasOwn(serviceDefinition.deps, key)) {
        throw new TypeError("Service dependency binding key is not an immediate dependency.");
      }

      const dependency = serviceDefinition.deps[key];
      if (dependency.kind !== "service.dependency.service") {
        throw new TypeError("Service dependency bindings may target only service dependencies.");
      }

      bindings.push([key, copyServiceDependencyBinding(value[key], dependency.service, active)]);
    }

    return Object.freeze(Object.fromEntries(bindings));
  } finally {
    active.delete(value);
  }
}

function copyServiceDependencyBinding(
  value: unknown,
  serviceDefinition: ServiceDefinition,
  active: WeakSet<object>
): ServiceDependencyBindingInput {
  assertPlainRecord(value, "Service dependency binding");
  assertOnlyKeys(value, dependencyBindingKeys, "Service dependency binding");

  if (active.has(value)) {
    throw new TypeError("Service dependency bindings must form a tree.");
  }

  active.add(value);
  try {
    if (value.instance !== undefined && typeof value.instance !== "string") {
      throw new TypeError("A service dependency instance must be a string.");
    }

    const scope =
      value.scope === undefined
        ? undefined
        : copyRuntimeConfigRef(value.scope, "Service dependency scope");
    const config =
      value.config === undefined
        ? undefined
        : copyRuntimeConfigRef(value.config, "Service dependency config");
    const dependencies =
      value.dependencies === undefined
        ? undefined
        : copyDependencyBindings(value.dependencies, serviceDefinition, active);

    return Object.freeze({
      ...(value.instance === undefined ? {} : { instance: value.instance }),
      ...(scope === undefined ? {} : { scope }),
      ...(config === undefined ? {} : { config }),
      ...(dependencies === undefined ? {} : { dependencies }),
    });
  } finally {
    active.delete(value);
  }
}

function copyServiceUseBinding(
  value: unknown,
  serviceDefinition: ServiceDefinition
): ServiceUseBindingInput {
  assertPlainRecord(value, "Service use binding");
  assertOnlyKeys(value, bindingKeys, "Service use binding");

  const active = new WeakSet<object>();
  active.add(value);
  try {
    const scope =
      value.scope === undefined ? undefined : copyRuntimeConfigRef(value.scope, "Service scope");
    const config =
      value.config === undefined ? undefined : copyRuntimeConfigRef(value.config, "Service config");
    const dependencies =
      value.dependencies === undefined
        ? undefined
        : copyDependencyBindings(value.dependencies, serviceDefinition, active);

    return Object.freeze({
      ...(scope === undefined ? {} : { scope }),
      ...(config === undefined ? {} : { config }),
      ...(dependencies === undefined ? {} : { dependencies }),
    });
  } finally {
    active.delete(value);
  }
}

export function useService<const TContract>(
  serviceDefinition: ServiceDefinition,
  options: {
    readonly contract: TContract;
    readonly instance?: string;
    readonly binding?: ServiceUseBindingInput;
  }
): ServiceUse<TContract> {
  const binding =
    options.binding === undefined
      ? undefined
      : copyServiceUseBinding(options.binding, serviceDefinition);
  const serviceUse = {
    kind: "service.use" as const,
    serviceId: serviceDefinition.id,
    ...(options.instance === undefined ? {} : { serviceInstance: options.instance }),
  };

  Object.defineProperty(serviceUse, serviceUseCarrier, {
    configurable: false,
    enumerable: false,
    value: Object.freeze({
      definition: serviceDefinition,
      contract: options.contract,
      ...(binding === undefined ? {} : { binding }),
    }),
    writable: false,
  });

  return Object.freeze(serviceUse) as ServiceUse<TContract>;
}

export function readServiceUse<TContract>(
  serviceUse: ServiceUse<TContract>
): ServiceUseCarrier<TContract> {
  return serviceUse[serviceUseCarrier];
}
