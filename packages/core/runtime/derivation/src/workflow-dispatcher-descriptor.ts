import { ReadonlyObject, type Static, Type } from "typebox";

export const WorkflowDispatcherDescriptorSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("workflow.dispatcher-descriptor"),
    descriptorId: Type.String({
      pattern: "^workflow-dispatcher:sha256:[0-9a-f]{64}$",
    }),
    appId: Type.String(),
    pluginOwnerId: Type.String({
      pattern: "^plugin-owner:sha256:[0-9a-f]{64}$",
    }),
    role: Type.Literal("async"),
    surface: Type.Literal("async/workflow"),
    capability: Type.String(),
    workflowIds: ReadonlyObject(Type.Array(Type.String())),
  }),
  { additionalProperties: false }
);

export type WorkflowDispatcherDescriptor = Static<typeof WorkflowDispatcherDescriptorSchema>;
