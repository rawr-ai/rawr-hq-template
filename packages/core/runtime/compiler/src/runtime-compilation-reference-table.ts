import type { RuntimeProvider } from "../../definition/src/provider";
import type { ResourceRequirement } from "../../definition/src/resource";
import type { ServiceRuntimeExport } from "../../definition/src/service";
import type { RuntimeAsyncSource } from "../../derivation/src/async-source";
import type { ProviderSelection } from "../../derivation/src/normalized-authoring-graph";
import type { RuntimeServerSource } from "../../derivation/src/server-source";
import type { ServiceBindingPlan } from "../../derivation/src/service-binding-plan";

import {
  asyncSourceCarrier,
  type RuntimeCompilationReferenceTable,
  resourceReferenceCarrier,
  serverSourceCarrier,
} from "./compilation-reference-contract";

type ResourceReferenceEntries = readonly (readonly [string, ResourceRequirement])[];
type ServerSourceEntries = readonly (readonly [string, RuntimeServerSource])[];
type AsyncSourceEntries = readonly (readonly [string, RuntimeAsyncSource])[];

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function createRuntimeCompilationReferenceTable(input: {
  readonly providers: readonly (readonly [ProviderSelection["selectionId"], RuntimeProvider])[];
  readonly services: readonly (readonly [ServiceBindingPlan["bindingId"], ServiceRuntimeExport])[];
  readonly resources: ResourceReferenceEntries;
  readonly serverSources: ServerSourceEntries;
  readonly asyncSources: AsyncSourceEntries;
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
    [asyncSourceCarrier]: Object.freeze(
      input.asyncSources.map(([id, source]) => Object.freeze([id, source] as const))
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
  Object.defineProperty(table, asyncSourceCarrier, { enumerable: false });
  return Object.freeze(table);
}

/** Authored orchestration reaches mounting only through its compiled selected surface. */
export function readRuntimeCompilationAsyncSources(
  table: RuntimeCompilationReferenceTable
): AsyncSourceEntries {
  if (!hasAsyncSources(table))
    throw new TypeError("Compilation lost its native async-source handoff.");
  return table[asyncSourceCarrier];
}

/** Native projections are available only beside the exact compiled selected surface. */
export function readRuntimeCompilationServerSources(
  table: RuntimeCompilationReferenceTable
): ServerSourceEntries {
  if (!hasServerSources(table))
    throw new TypeError("Compilation lost its native server-source handoff.");
  return table[serverSourceCarrier];
}

/** Exact authored requirements are private capabilities, not inspection-table fields. */
export function readRuntimeCompilationResourceReferences(
  table: RuntimeCompilationReferenceTable
): ResourceReferenceEntries {
  if (!hasResourceReferences(table))
    throw new TypeError("Compilation lost its resource-reference handoff.");
  return table[resourceReferenceCarrier];
}

// The private constructor is the only producer; consumers receive opaque carrier types.
function hasAsyncSources(
  table: RuntimeCompilationReferenceTable
): table is RuntimeCompilationReferenceTable & {
  readonly [asyncSourceCarrier]: AsyncSourceEntries;
} {
  return Object.hasOwn(table, asyncSourceCarrier) && table[asyncSourceCarrier] !== undefined;
}

function hasServerSources(
  table: RuntimeCompilationReferenceTable
): table is RuntimeCompilationReferenceTable & {
  readonly [serverSourceCarrier]: ServerSourceEntries;
} {
  return Object.hasOwn(table, serverSourceCarrier) && table[serverSourceCarrier] !== undefined;
}

function hasResourceReferences(
  table: RuntimeCompilationReferenceTable
): table is RuntimeCompilationReferenceTable & {
  readonly [resourceReferenceCarrier]: ResourceReferenceEntries;
} {
  return (
    Object.hasOwn(table, resourceReferenceCarrier) && table[resourceReferenceCarrier] !== undefined
  );
}
