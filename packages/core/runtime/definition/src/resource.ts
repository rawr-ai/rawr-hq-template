import type { RuntimeRedactionPolicy } from "../../schema/src/runtime-schema";
import type { AppRole } from "./app";
import type { RuntimeObservationRecord } from "./observation";

export type ResourceLifetime = "process" | "role";

export interface RuntimeObservationContributor<TValue = unknown> {
  toObservationRecord(input: {
    readonly value: TValue;
    readonly redaction: RuntimeRedactionPolicy;
  }): RuntimeObservationRecord;
}

export interface RuntimeResource<TId extends string = string, TValue = unknown> {
  readonly kind: "runtime.resource";
  readonly id: TId;
  readonly title: string;
  readonly purpose: string;
  readonly defaultLifetime: ResourceLifetime;
  readonly allowedLifetimes: readonly ResourceLifetime[];
  readonly observationContributor?: RuntimeObservationContributor<TValue>;
}

export type RuntimeResourceValue<TResource extends RuntimeResource> =
  TResource extends RuntimeResource<string, infer TValue> ? TValue : never;

export function defineRuntimeResource<const TId extends string, TValue>(input: {
  readonly id: TId;
  readonly title: string;
  readonly purpose: string;
  readonly defaultLifetime?: ResourceLifetime;
  readonly allowedLifetimes?: readonly ResourceLifetime[];
  readonly observationContributor?: RuntimeObservationContributor<TValue>;
}): RuntimeResource<TId, TValue> {
  const defaultLifetime = input.defaultLifetime ?? "process";
  const allowedLifetimes = Object.freeze([...(input.allowedLifetimes ?? [defaultLifetime])]);
  if (!allowedLifetimes.includes(defaultLifetime)) {
    throw new TypeError("A runtime resource's default lifetime must be allowed.");
  }
  return Object.freeze({ ...input, kind: "runtime.resource", defaultLifetime, allowedLifetimes });
}

export interface ResourceRequirement<TResource extends RuntimeResource = RuntimeResource> {
  readonly resource: TResource;
  readonly lifetime?: ResourceLifetime;
  readonly role?: AppRole;
  readonly optional?: boolean;
  readonly instance?: string;
  readonly reason: string;
}

export function requireResource<const TResource extends RuntimeResource>(
  input: ResourceRequirement<TResource>
): ResourceRequirement<TResource> {
  return Object.freeze({ ...input });
}
