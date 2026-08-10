import type { RuntimeSchema } from "../../schema/src/runtime-schema";
import type { AppRole } from "./app";
import type { RuntimeObservationPort } from "./observation";
import type {
  ResourceLifetime,
  ResourceRequirement,
  RuntimeResource,
  RuntimeResourceValue,
} from "./resource";

export interface RuntimeResourceMap {
  get<TResource extends RuntimeResource>(
    resource: TResource,
    instance?: string
  ): RuntimeResourceValue<TResource>;
}

export interface ProviderScope {
  readonly appId: string;
  readonly processId: string;
  readonly role?: AppRole;
  readonly lifetime: ResourceLifetime;
  readonly instance?: string;
}

export interface RuntimeProviderHealthDescriptor {
  readonly kind: "provider.health";
  readonly required?: boolean;
}

export type ProviderAcquire<TValue> = () => Promise<TValue> | TValue;
export type ProviderRelease<TValue> = (value: TValue) => Promise<void> | void;

export type ProviderEffectPlanOperation<TValue, TError> =
  | {
      readonly kind: "acquire-release";
      readonly acquire: ProviderAcquire<TValue>;
      readonly release?: ProviderRelease<TValue>;
    }
  | {
      readonly kind: "try-acquire";
      readonly acquire: ProviderAcquire<TValue>;
      readonly recover: (cause: unknown) => TError;
    }
  | {
      readonly kind: "span";
      readonly name: string;
      readonly plan: ProviderEffectPlan<TValue, TError>;
      readonly attributes?: Readonly<Record<string, string | number | boolean>>;
    };

export interface ProviderEffectPlan<TValue, TError = never> {
  readonly kind: "provider.effect-plan";
  readonly operation: ProviderEffectPlanOperation<TValue, TError>;
}

export interface ProviderFx {
  acquireRelease<TValue>(input: {
    readonly acquire: ProviderAcquire<TValue>;
    readonly release?: ProviderRelease<TValue>;
  }): ProviderEffectPlan<TValue>;
  tryAcquire<TValue, TError>(input: {
    readonly acquire: ProviderAcquire<TValue>;
    readonly catch: (cause: unknown) => TError;
  }): ProviderEffectPlan<TValue, TError>;
  withSpan<TValue, TError>(
    name: string,
    plan: ProviderEffectPlan<TValue, TError>,
    attributes?: Readonly<Record<string, string | number | boolean>>
  ): ProviderEffectPlan<TValue, TError>;
}

const providerFxFacade: ProviderFx = {
  acquireRelease: (input) =>
    Object.freeze({
      kind: "provider.effect-plan",
      operation: Object.freeze({ kind: "acquire-release", ...input }),
    }),
  tryAcquire: (input) =>
    Object.freeze({
      kind: "provider.effect-plan",
      operation: Object.freeze({
        kind: "try-acquire",
        acquire: input.acquire,
        recover: input.catch,
      }),
    }),
  withSpan: (name, plan, attributes) =>
    Object.freeze({
      kind: "provider.effect-plan",
      operation: Object.freeze({
        kind: "span",
        name,
        plan,
        ...(attributes === undefined ? {} : { attributes: Object.freeze({ ...attributes }) }),
      }),
    }),
};

export const providerFx: ProviderFx = Object.freeze(providerFxFacade);

export interface ProviderBuildContext<TConfig> {
  readonly config: TConfig;
  readonly resources: RuntimeResourceMap;
  readonly scope: ProviderScope;
  readonly observation: RuntimeObservationPort;
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
  build(
    input: ProviderBuildContext<TConfig>
  ): ProviderEffectPlan<RuntimeResourceValue<TResource>, unknown>;
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
  });
}
