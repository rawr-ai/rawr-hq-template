import type { RuntimeProvider } from "../../definition/src/provider";
import type { ServiceRuntimeExport } from "../../definition/src/service";
import type { ProviderSelection } from "../../derivation/src/normalized-authoring-graph";
import type { ServiceBindingPlan } from "../../derivation/src/service-binding-plan";

export const resourceReferenceCarrier = Symbol("habitat.compilation.resource-references");
export const serverSourceCarrier = Symbol("habitat.compilation.server-sources");
export const asyncSourceCarrier = Symbol("habitat.compilation.async-sources");

/** Opaque cold handoffs do not make optional native hosts a dependency of plan consumers. */
export interface RuntimeCompilationReferenceTable {
  readonly kind: "runtime.compilation-reference-table";
  readonly [resourceReferenceCarrier]: unknown;
  readonly [serverSourceCarrier]: unknown;
  readonly [asyncSourceCarrier]: unknown;

  getProvider(selectionId: ProviderSelection["selectionId"]): RuntimeProvider;
  getService(bindingId: ServiceBindingPlan["bindingId"]): ServiceRuntimeExport;

  providerEntries(): readonly (readonly [ProviderSelection["selectionId"], RuntimeProvider])[];
  serviceEntries(): readonly (readonly [ServiceBindingPlan["bindingId"], ServiceRuntimeExport])[];
}
