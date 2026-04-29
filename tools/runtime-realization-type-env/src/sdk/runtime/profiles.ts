import type { RuntimeProvider } from "./providers";
import type { AppRole, ResourceLifetime, RuntimeResource } from "./resources";

export interface ProviderSelection<
  TResource extends RuntimeResource<unknown> = RuntimeResource<unknown>,
  TProvider extends RuntimeProvider<TResource> = RuntimeProvider<TResource>,
> {
  readonly kind: "provider.selection";
  readonly resource: TResource;
  readonly provider: TProvider;
  readonly lifetime: ResourceLifetime;
  readonly role?: AppRole;
  readonly instance?: string;
}

export interface RuntimeProfile {
  readonly kind: "runtime.profile";
  readonly id: string;
  readonly providerSelections: readonly ProviderSelection[];
}

export function providerSelection<
  const TResource extends RuntimeResource<unknown>,
  const TProvider extends RuntimeProvider<TResource>,
>(input: Omit<ProviderSelection<TResource, TProvider>, "kind">) {
  return {
    kind: "provider.selection",
    ...input,
  } as const satisfies ProviderSelection<TResource, TProvider>;
}

export function defineRuntimeProfile<const TInput extends RuntimeProfile>(
  input: TInput,
): TInput {
  return input;
}
