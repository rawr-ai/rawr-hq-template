import type { AppRole } from "./app";
import type { RuntimeProvider } from "./provider";
import type { ResourceLifetime, RuntimeResource } from "./resource";

export interface RuntimeConfigBinding {
  readonly from: "runtime-config";
  readonly key: string;
}

export interface ProviderSelection<TProvider extends RuntimeProvider = RuntimeProvider> {
  readonly kind: "runtime.provider-selection";
  readonly provider: TProvider;
  readonly resource: RuntimeResource;
  readonly lifetime?: ResourceLifetime;
  readonly role?: AppRole;
  readonly instance?: string;
  readonly config?: RuntimeConfigBinding;
}
