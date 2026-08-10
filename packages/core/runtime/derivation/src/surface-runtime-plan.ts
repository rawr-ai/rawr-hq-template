import { ReadonlyObject, type Static, Type } from "typebox";

import { ExecutionDescriptorRefSchema } from "./execution-descriptor-ref";
import { NormalizedAppRoleSchema } from "./normalized-runtime-topology";
import { WebRouteModuleRefSchema } from "./web-route-module-table";

export const SurfaceRuntimePlanSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("surface.runtime-plan"),
    surfacePlanId: Type.String({
      pattern: "^surface-plan:sha256:[0-9a-f]{64}$",
    }),
    pluginOwnerId: Type.String({
      pattern: "^plugin-owner:sha256:[0-9a-f]{64}$",
    }),
    role: NormalizedAppRoleSchema,
    surface: Type.String(),
    capability: Type.String(),
    serviceBindingIds: ReadonlyObject(
      Type.Array(Type.String({ pattern: "^service-binding:sha256:[0-9a-f]{64}$" }))
    ),
    resourceRequirementIds: ReadonlyObject(
      Type.Array(Type.String({ pattern: "^resource-requirement:sha256:[0-9a-f]{64}$" }))
    ),
    workflowDispatcherDescriptorIds: ReadonlyObject(
      Type.Array(Type.String({ pattern: "^workflow-dispatcher:sha256:[0-9a-f]{64}$" }))
    ),
    executionDescriptorRefs: ReadonlyObject(Type.Array(ExecutionDescriptorRefSchema)),
    webRouteModuleRefs: ReadonlyObject(Type.Array(WebRouteModuleRefSchema)),
  }),
  { additionalProperties: false }
);

export type SurfaceRuntimePlan = Static<typeof SurfaceRuntimePlanSchema>;
