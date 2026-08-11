import type { RuntimeSchema } from "../../schema/src/runtime-schema";
import type { RuntimeObservationPort } from "./observation";
import type { ProviderEffectPlan } from "./provider-effect-plan";
import type { ResourceRequirement, RuntimeResource, RuntimeResourceValue } from "./resource";

export interface RuntimeProviderHealthDescriptor {
  readonly kind: "provider.health";
  readonly required?: boolean;
}

export interface RuntimeResourceMap {
  has(requirement: ResourceRequirement): boolean;

  get<TResource extends RuntimeResource>(
    requirement: ResourceRequirement<TResource> & {
      readonly optional: true;
    }
  ): RuntimeResourceValue<TResource> | undefined;

  get<TResource extends RuntimeResource>(
    requirement: ResourceRequirement<TResource> & {
      readonly optional?: false | undefined;
    }
  ): RuntimeResourceValue<TResource>;

  get<TResource extends RuntimeResource>(
    requirement: ResourceRequirement<TResource>
  ): RuntimeResourceValue<TResource> | undefined;
}

export interface ProviderBuildContext<TConfig> {
  readonly config: TConfig;
  readonly resources: RuntimeResourceMap;
  readonly observation: RuntimeObservationPort;
}

export interface RuntimeProvider<
  TResource extends RuntimeResource = RuntimeResource,
  TConfig = unknown,
  TAcquireError = unknown,
> {
  readonly kind: "runtime.provider";
  readonly id: string;
  readonly title: string;
  readonly provides: TResource;
  readonly requires: readonly ResourceRequirement[];
  readonly configSchema?: RuntimeSchema<TConfig>;
  readonly defaultConfigKey?: string;
  readonly health?: RuntimeProviderHealthDescriptor;

  build(
    context: ProviderBuildContext<TConfig>
  ): ProviderEffectPlan<RuntimeResourceValue<TResource>, TAcquireError>;
}

type RuntimeProviderInput<TResource extends RuntimeResource, TConfig, TAcquireError> = Omit<
  RuntimeProvider<TResource, TConfig, TAcquireError>,
  "kind"
>;

export function defineRuntimeProvider<
  const TResource extends RuntimeResource,
  TConfig = undefined,
  TAcquireError = never,
>(
  input: RuntimeProviderInput<TResource, TConfig, TAcquireError>
): RuntimeProvider<TResource, TConfig, TAcquireError> {
  return Object.freeze({
    ...input,
    kind: "runtime.provider",
    requires: Object.freeze([...input.requires]),
    ...(input.health === undefined ? {} : { health: Object.freeze({ ...input.health }) }),
  });
}
