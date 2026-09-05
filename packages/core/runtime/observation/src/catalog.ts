import { ReadonlyObject, type Static, Type } from "typebox";
import type { RuntimeDiagnostic } from "./telemetry";

const id = Type.String({ minLength: 1 });
const strings = () => ReadonlyObject(Type.Array(id));
const object = <T extends Record<string, import("typebox").TSchema>>(fields: T) =>
  ReadonlyObject(Type.Object(fields), { additionalProperties: false });
const list = <T extends import("typebox").TSchema>(item: T) => ReadonlyObject(Type.Array(item));
const role = Type.Union([
  Type.Literal("server"),
  Type.Literal("async"),
  Type.Literal("web"),
  Type.Literal("agent"),
  Type.Literal("desktop"),
  Type.Literal("cli"),
]);

export const RuntimeObservationSeedSchema = object({
  identity: object({ app: id, process: id, entrypoint: id, deployment: id, source: id }),
  profileId: id,
  roles: list(role),
  derivedAuthoring: object({ pluginOwnerIds: strings(), serviceIds: strings() }),
  resources: list(
    object({
      requirementId: id,
      resourceId: id,
      optional: Type.Boolean(),
      instance: Type.Optional(id),
      role: Type.Optional(role),
      lifetime: Type.Union([Type.Literal("process"), Type.Literal("role")]),
    })
  ),
  providers: list(
    object({ selectionId: id, providerId: id, resourceId: id, requirementIds: strings() })
  ),
  providerDependencyGraph: object({
    nodes: strings(),
    edges: list(object({ fromSelectionId: id, toSelectionId: id, requirementId: id })),
    closure: list(object({ selectionId: id, reachableSelectionIds: strings() })),
  }),
  plugins: list(
    object({ pluginOwnerId: id, role, surface: id, capability: id, instance: Type.Optional(id) })
  ),
  serviceAttachments: list(
    object({
      bindingId: id,
      serviceId: id,
      role,
      instance: Type.Optional(id),
      dependencyBindingIds: strings(),
    })
  ),
  workflowDispatchers: list(object({ dispatcherId: id })),
  executionPlans: list(object({ executionId: id, ownerId: id, boundary: id })),
  executionRegistry: object({ executionIds: strings() }),
  surfaces: list(
    object({
      surfacePlanId: id,
      pluginOwnerId: id,
      role,
      surface: id,
      capability: id,
      instance: Type.Optional(id),
      bindingIds: strings(),
      executionIds: strings(),
    })
  ),
  harnesses: list(object({ harnessId: id })),
});

export type RuntimeObservationSeed = Static<typeof RuntimeObservationSeedSchema>;
export interface RuntimeTopologyRecord {
  readonly kind: "topology.selected";
  readonly processId: string;
  readonly profileId: string;
}
export interface RuntimeFinalizationRecord {
  readonly kind: "provider.release.failed";
  readonly selectionId: string;
  readonly providerId: string;
  readonly typedFailure: boolean;
  readonly defect: boolean;
  readonly interrupted: boolean;
}
export interface RuntimeCatalog {
  readonly processIdentity: {
    readonly id: string;
    readonly deployment: string;
    readonly source: string;
  };
  readonly appIdentity: { readonly id: string };
  readonly entrypointIdentity: { readonly id: string };
  readonly roles: RuntimeObservationSeed["roles"];
  readonly derivedAuthoring: RuntimeObservationSeed["derivedAuthoring"];
  readonly resources: RuntimeObservationSeed["resources"];
  readonly providers: readonly (RuntimeObservationSeed["providers"][number] & {
    readonly releaseStatus: "unobserved" | "failed";
  })[];
  readonly providerDependencyGraph: RuntimeObservationSeed["providerDependencyGraph"];
  readonly plugins: RuntimeObservationSeed["plugins"];
  readonly serviceAttachments: RuntimeObservationSeed["serviceAttachments"];
  readonly workflowDispatchers: RuntimeObservationSeed["workflowDispatchers"];
  readonly executionPlans: RuntimeObservationSeed["executionPlans"];
  readonly executionRegistry: RuntimeObservationSeed["executionRegistry"] & {
    readonly status: "unobserved";
  };
  readonly surfaces: RuntimeObservationSeed["surfaces"];
  readonly harnesses: RuntimeObservationSeed["harnesses"];
  readonly lifecycleTimestamps: {
    readonly observedAt: number;
    readonly lastRecordAt: number | null;
  };
  readonly lifecycleStatus: {
    readonly topology: "selected";
    readonly provisioning: "unobserved";
    readonly execution: "unobserved";
    readonly mounting: "unobserved";
    readonly finalization: "unobserved" | "failure-observed";
  };
  readonly diagnostics: readonly RuntimeDiagnostic[];
  readonly topologyRecords: readonly RuntimeTopologyRecord[];
  readonly startupRecords: readonly never[];
  readonly executionRecords: readonly never[];
  readonly finalizationRecords: readonly RuntimeFinalizationRecord[];
  readonly retention: { readonly limit: number; readonly dropped: number };
}
