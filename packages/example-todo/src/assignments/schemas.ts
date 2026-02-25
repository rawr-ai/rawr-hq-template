import { type Static, Type } from "typebox";

export const AssignmentSchema = Type.Object(
  {
    id: Type.String({ format: "uuid" }),
    taskId: Type.String({ format: "uuid" }),
    tagId: Type.String({ format: "uuid" }),
    createdAt: Type.String({ format: "date-time" }),
  },
  { additionalProperties: false },
);

export type Assignment = Static<typeof AssignmentSchema>;
