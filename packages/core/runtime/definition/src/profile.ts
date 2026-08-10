import type { AppRole } from "./app";
import type { RuntimeProvider } from "./provider";
import type { ResourceLifetime, RuntimeResource } from "./resource";

export type RuntimeConfigSource =
  | { readonly kind: "env"; readonly prefix?: string }
  | {
      readonly kind: "dotenv";
      readonly path?: string;
      readonly optional?: boolean;
    }
  | {
      readonly kind: "file";
      readonly path: string;
      readonly optional?: boolean;
    }
  | { readonly kind: "memory" }
  | { readonly kind: "test" };

export interface ProviderSelection<TProvider extends RuntimeProvider = RuntimeProvider> {
  readonly provider: TProvider;
  readonly resource: RuntimeResource;
  readonly lifetime?: ResourceLifetime;
  readonly role?: AppRole;
  readonly instance?: string;
  readonly config?: {
    readonly kind: "runtime.config";
    readonly key: string;
  };
}

function copyProviderConfigRef(value: unknown): NonNullable<ProviderSelection["config"]> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("A provider selection config must be a plain object.");
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("A provider selection config must be a plain object.");
  }
  if (Reflect.ownKeys(value).some((key) => key !== "kind" && key !== "key")) {
    throw new TypeError("A provider selection config contains an unknown field.");
  }
  if (
    !("kind" in value) ||
    value.kind !== "runtime.config" ||
    !("key" in value) ||
    typeof value.key !== "string" ||
    value.key.length === 0
  ) {
    throw new TypeError("A provider selection config must contain a nonempty runtime config key.");
  }

  return Object.freeze({ kind: "runtime.config", key: value.key });
}

export function providerSelection(input: {
  resource: RuntimeResource;
  provider: RuntimeProvider;
  lifetime?: ResourceLifetime;
  role?: AppRole;
  instance?: string;
  config?: {
    readonly kind: "runtime.config";
    readonly key: string;
  };
}): ProviderSelection {
  const config = input.config === undefined ? undefined : copyProviderConfigRef(input.config);

  return Object.freeze({
    provider: input.provider,
    resource: input.resource,
    ...(input.lifetime === undefined ? {} : { lifetime: input.lifetime }),
    ...(input.role === undefined ? {} : { role: input.role }),
    ...(input.instance === undefined ? {} : { instance: input.instance }),
    ...(config === undefined ? {} : { config }),
  });
}

export interface RuntimeProfile<
  TId extends string = string,
  TProviders extends readonly unknown[] = readonly unknown[],
> {
  readonly kind: "runtime.profile";
  readonly id: TId;
  readonly providers: TProviders;
  readonly configSources: readonly RuntimeConfigSource[];
  readonly processDefaults?: Readonly<Record<string, unknown>>;
  readonly harnesses?: readonly string[];
}

export function defineRuntimeProfile<
  const TId extends string,
  const TProviders extends readonly unknown[],
>(input: {
  readonly id: TId;
  readonly providers: TProviders;
  readonly configSources?: readonly RuntimeConfigSource[];
  readonly processDefaults?: Readonly<Record<string, unknown>>;
  readonly harnesses?: readonly string[];
}): RuntimeProfile<TId, TProviders> {
  return Object.freeze({
    kind: "runtime.profile",
    id: input.id,
    providers: Object.freeze([...input.providers]) as unknown as TProviders,
    configSources: Object.freeze(
      (input.configSources ?? []).map((source) => Object.freeze({ ...source }))
    ),
    ...(input.processDefaults === undefined
      ? {}
      : { processDefaults: Object.freeze({ ...input.processDefaults }) }),
    ...(input.harnesses === undefined ? {} : { harnesses: Object.freeze([...input.harnesses]) }),
  });
}
