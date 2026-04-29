import type { RuntimeSchema } from "./schema";

const RESOURCE_VALUE: unique symbol = Symbol("runtime.resource.value");

export type ResourceLifetime = "process" | "role" | "surface";

export type AppRole = "server" | "cli" | "web" | "agent" | "async";

export interface RuntimeResource<TValue = unknown> {
  readonly kind: "runtime.resource";
  readonly id: string;
  readonly title: string;
  readonly valueSchema?: RuntimeSchema<TValue>;
  readonly [RESOURCE_VALUE]?: TValue;
}

export type RuntimeResourceValue<TResource extends RuntimeResource<unknown>> =
  TResource extends RuntimeResource<infer TValue> ? TValue : never;

export interface ResourceRequirement<
  TResource extends RuntimeResource<unknown> = RuntimeResource<unknown>,
> {
  readonly resource: TResource;
  readonly lifetime?: ResourceLifetime;
  readonly role?: AppRole;
  readonly optional?: boolean;
  readonly instance?: string;
  readonly reason: string;
}

export function defineRuntimeResource<const TId extends string, TValue>(input: {
  readonly id: TId;
  readonly title: string;
  readonly valueSchema?: RuntimeSchema<TValue>;
}): RuntimeResource<TValue> {
  return {
    kind: "runtime.resource",
    id: input.id,
    title: input.title,
    valueSchema: input.valueSchema,
  };
}

export function resourceRequirement<
  const TResource extends RuntimeResource<unknown>,
>(
  resource: TResource,
  options: Omit<ResourceRequirement<TResource>, "resource">,
): ResourceRequirement<TResource> {
  return {
    ...options,
    resource,
  };
}
