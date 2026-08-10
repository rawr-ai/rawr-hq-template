import { ReadonlyObject, type Static, Type } from "typebox";

import { NormalizedAppRoleSchema } from "./normalized-runtime-topology";

const closed = { additionalProperties: false } as const;
const nonemptyConfigString = Type.String({ minLength: 1 });
const appRootRelativePosixPath = Type.String({
  minLength: 1,
  pattern: "^(?!/)(?!.*\\\\)(?!\\.{1,2}(?:/|$))(?!.*\\/\\.{1,2}(?:/|$)).+$",
});

export const NormalizedRuntimeConfigSourceRefSchema = Type.Union([
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("runtime.config.env"),
      key: nonemptyConfigString,
      name: nonemptyConfigString,
    }),
    closed
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("runtime.config.dotenv"),
      key: nonemptyConfigString,
      path: appRootRelativePosixPath,
      optional: Type.Boolean(),
    }),
    closed
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("runtime.config.file"),
      key: nonemptyConfigString,
      path: appRootRelativePosixPath,
      optional: Type.Boolean(),
    }),
    closed
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("runtime.config.memory"),
      key: nonemptyConfigString,
    }),
    closed
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("runtime.config.test"),
      key: nonemptyConfigString,
    }),
    closed
  ),
]);

export const NormalizedRuntimeConfigRefSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("runtime.config-ref"),
    key: nonemptyConfigString,
    sources: ReadonlyObject(Type.Array(NormalizedRuntimeConfigSourceRefSchema)),
  }),
  closed
);

export const ServiceBindingPlanSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("service.binding-plan"),
    bindingId: Type.String({
      pattern: "^service-binding:sha256:[0-9a-f]{64}$",
    }),
    role: NormalizedAppRoleSchema,
    serviceId: Type.String(),
    serviceInstance: Type.Optional(Type.String()),
    scopeRef: Type.Optional(NormalizedRuntimeConfigRefSchema),
    configRef: Type.Optional(NormalizedRuntimeConfigRefSchema),
    resourceRequirementIds: ReadonlyObject(
      Type.Array(
        Type.String({
          pattern: "^resource-requirement:sha256:[0-9a-f]{64}$",
        })
      )
    ),
    serviceBindingIds: ReadonlyObject(
      Type.Array(
        Type.String({
          pattern: "^service-binding:sha256:[0-9a-f]{64}$",
        })
      )
    ),
    semanticDependencyIds: ReadonlyObject(
      Type.Array(
        Type.String({
          pattern: "^semantic-dependency:sha256:[0-9a-f]{64}$",
        })
      )
    ),
  }),
  closed
);

export type NormalizedRuntimeConfigSourceRef = Static<
  typeof NormalizedRuntimeConfigSourceRefSchema
>;
export type NormalizedRuntimeConfigRef = Static<typeof NormalizedRuntimeConfigRefSchema>;
export type ServiceBindingPlan = Static<typeof ServiceBindingPlanSchema>;
