import type {
  ResourceRequirement,
  RuntimeProvider,
  ServiceRuntimeExport,
} from "../../definition/src/index";
import type { ProviderSelection } from "../../derivation/src/normalized-authoring-graph";
import type { RuntimeServerSource } from "../../derivation/src/server-source";
import type { ServiceBindingPlan } from "../../derivation/src/service-binding-plan";

const resourceReferenceCarrier = Symbol("habitat.compilation.resource-references");
const serverSourceCarrier = Symbol("habitat.compilation.server-sources");

type ResourceReferenceEntries = readonly (readonly [string, ResourceRequirement])[];
type ServerSourceEntries = readonly (readonly [string, RuntimeServerSource])[];

export interface RuntimeCompilationReferenceTable {
  readonly kind: "runtime.compilation-reference-table";
  readonly [resourceReferenceCarrier]: ResourceReferenceEntries;
  readonly [serverSourceCarrier]: ServerSourceEntries;

  getProvider(selectionId: ProviderSelection["selectionId"]): RuntimeProvider;
  getService(bindingId: ServiceBindingPlan["bindingId"]): ServiceRuntimeExport;

  providerEntries(): readonly (readonly [ProviderSelection["selectionId"], RuntimeProvider])[];
  serviceEntries(): readonly (readonly [ServiceBindingPlan["bindingId"], ServiceRuntimeExport])[];
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function createRuntimeCompilationReferenceTable(input: {
  readonly providers: readonly (readonly [ProviderSelection["selectionId"], RuntimeProvider])[];
  readonly services: readonly (readonly [ServiceBindingPlan["bindingId"], ServiceRuntimeExport])[];
  readonly resources: ResourceReferenceEntries;
  readonly serverSources: ServerSourceEntries;
}): RuntimeCompilationReferenceTable {
  const providers = new Map<ProviderSelection["selectionId"], RuntimeProvider>();
  const services = new Map<ServiceBindingPlan["bindingId"], ServiceRuntimeExport>();

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

  const table = {
    kind: "runtime.compilation-reference-table" as const,
    [resourceReferenceCarrier]: Object.freeze(
      input.resources.map(([id, requirement]) => Object.freeze([id, requirement] as const))
    ),
    [serverSourceCarrier]: Object.freeze(
      input.serverSources.map(([id, source]) => Object.freeze([id, source] as const))
    ),
    getProvider(selectionId: ProviderSelection["selectionId"]): RuntimeProvider {
      const provider = providers.get(selectionId);
      if (provider === undefined) throw new TypeError("Provider reference is absent.");
      return provider;
    },
    getService(bindingId: ServiceBindingPlan["bindingId"]): ServiceRuntimeExport {
      const service = services.get(bindingId);
      if (service === undefined) throw new TypeError("Service reference is absent.");
      return service;
    },
    providerEntries: () => providerSnapshot,
    serviceEntries: () => serviceSnapshot,
  };
  Object.defineProperty(table, resourceReferenceCarrier, { enumerable: false });
  Object.defineProperty(table, serverSourceCarrier, { enumerable: false });
  return Object.freeze(table);
}

/** Native projections are available only beside the exact compiled selected surface. */
export function readRuntimeCompilationServerSources(
  table: RuntimeCompilationReferenceTable
): ServerSourceEntries {
  const entries = table[serverSourceCarrier];
  if (entries === undefined)
    throw new TypeError("Compilation lost its native server-source handoff.");
  return entries;
}

/** Exact authored requirements are private capabilities, not inspection-table fields. */
export function readRuntimeCompilationResourceReferences(
  table: RuntimeCompilationReferenceTable
): ResourceReferenceEntries {
  const entries = table[resourceReferenceCarrier];
  if (entries === undefined)
    throw new TypeError("Compilation lost its resource-reference handoff.");
  return entries;
}
