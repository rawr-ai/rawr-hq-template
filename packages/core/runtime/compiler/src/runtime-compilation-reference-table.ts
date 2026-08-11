import type { RuntimeProvider, ServiceDefinition } from "../../definition/src/index";
import type { ProviderSelection } from "../../derivation/src/normalized-authoring-graph";
import type { ServiceBindingPlan } from "../../derivation/src/service-binding-plan";

export interface RuntimeCompilationReferenceTable {
  readonly kind: "runtime.compilation-reference-table";

  getProvider(selectionId: ProviderSelection["selectionId"]): RuntimeProvider;
  getService(bindingId: ServiceBindingPlan["bindingId"]): ServiceDefinition;

  providerEntries(): readonly (readonly [ProviderSelection["selectionId"], RuntimeProvider])[];
  serviceEntries(): readonly (readonly [ServiceBindingPlan["bindingId"], ServiceDefinition])[];
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function createRuntimeCompilationReferenceTable(input: {
  readonly providers: readonly (readonly [ProviderSelection["selectionId"], RuntimeProvider])[];
  readonly services: readonly (readonly [ServiceBindingPlan["bindingId"], ServiceDefinition])[];
}): RuntimeCompilationReferenceTable {
  const providers = new Map<ProviderSelection["selectionId"], RuntimeProvider>();
  const services = new Map<ServiceBindingPlan["bindingId"], ServiceDefinition>();

  for (const [selectionId, provider] of input.providers) {
    if (providers.has(selectionId)) throw new TypeError("Duplicate provider reference.");
    providers.set(selectionId, provider);
  }
  for (const [bindingId, service] of input.services) {
    if (services.has(bindingId)) throw new TypeError("Duplicate service reference.");
    services.set(bindingId, service);
  }

  const providerSnapshot = Object.freeze(
    [...providers]
      .sort(([left], [right]) => compareStrings(left, right))
      .map(([selectionId, provider]) => Object.freeze([selectionId, provider] as const))
  );
  const serviceSnapshot = Object.freeze(
    [...services]
      .sort(([left], [right]) => compareStrings(left, right))
      .map(([bindingId, service]) => Object.freeze([bindingId, service] as const))
  );

  return Object.freeze({
    kind: "runtime.compilation-reference-table" as const,
    getProvider(selectionId: ProviderSelection["selectionId"]): RuntimeProvider {
      const provider = providers.get(selectionId);
      if (provider === undefined) throw new TypeError("Provider reference is absent.");
      return provider;
    },
    getService(bindingId: ServiceBindingPlan["bindingId"]): ServiceDefinition {
      const service = services.get(bindingId);
      if (service === undefined) throw new TypeError("Service reference is absent.");
      return service;
    },
    providerEntries: () => providerSnapshot,
    serviceEntries: () => serviceSnapshot,
  });
}
