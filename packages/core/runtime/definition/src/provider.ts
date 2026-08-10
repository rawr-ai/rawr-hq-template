import type { RuntimeSchema } from "../../schema/src/runtime-schema";
import type { ResourceRequirement, RuntimeResource } from "./resource";

export interface RuntimeProviderHealthDescriptor {
  readonly kind: "provider.health";
  readonly required?: boolean;
}

export interface RuntimeProvider<
  TResource extends RuntimeResource = RuntimeResource,
  TConfig = unknown,
> {
  readonly kind: "runtime.provider";
  readonly id: string;
  readonly title: string;
  readonly provides: TResource;
  readonly requires: readonly ResourceRequirement[];
  readonly configSchema?: RuntimeSchema<TConfig>;
  readonly defaultConfigKey?: string;
  readonly health?: RuntimeProviderHealthDescriptor;
}

type RuntimeProviderInput<TResource extends RuntimeResource, TConfig> = Omit<
  RuntimeProvider<TResource, TConfig>,
  "kind"
>;

export function defineRuntimeProvider<const TResource extends RuntimeResource, TConfig = never>(
  input: RuntimeProviderInput<TResource, TConfig>
): RuntimeProvider<TResource, TConfig> {
  return Object.freeze({
    ...input,
    kind: "runtime.provider",
    requires: Object.freeze([...input.requires]),
    ...(input.health === undefined ? {} : { health: Object.freeze({ ...input.health }) }),
  });
}
