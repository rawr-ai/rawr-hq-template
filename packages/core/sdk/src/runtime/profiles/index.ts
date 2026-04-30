import type { RuntimeProvider } from "../providers";
import type { AppRole, ResourceLifetime, RuntimeResource } from "../resources";

export interface ProviderSelection<
  TResource extends RuntimeResource = RuntimeResource,
  TProvider extends RuntimeProvider<TResource> = RuntimeProvider<TResource>,
> {
  readonly kind: "provider.selection";
  readonly resource: TResource;
  readonly provider: TProvider;
  readonly lifetime?: ResourceLifetime;
  readonly role?: AppRole;
  readonly instance?: string;
  readonly configKey?: string;
}

export type ConfigSource =
  | { readonly kind: "env"; readonly prefix?: string }
  | { readonly kind: "file"; readonly path: string; readonly optional?: boolean };

export interface RuntimeProfile {
  readonly kind: "runtime.profile";
  readonly id: string;
  readonly providers?: readonly ProviderSelection[];
  readonly providerSelections?: readonly ProviderSelection[];
  readonly configSources?: readonly ConfigSource[];
}

export function providerSelection<
  const TResource extends RuntimeResource,
  const TProvider extends RuntimeProvider<TResource>,
>(input: Omit<ProviderSelection<TResource, TProvider>, "kind">): ProviderSelection<TResource, TProvider> {
  return {
    kind: "provider.selection",
    ...input,
  };
}

export function defineRuntimeProfile<const TInput extends Omit<RuntimeProfile, "kind">>(
  input: TInput,
): TInput & { readonly kind: "runtime.profile" } {
  return {
    kind: "runtime.profile",
    ...input,
  };
}
