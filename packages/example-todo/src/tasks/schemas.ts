import { type Static, Type } from "typebox";

export const TaskSchema = Type.Object(
  {
    id: Type.String({ format: "uuid" }),
    title: Type.String({ minLength: 1, maxLength: 500 }),
    description: Type.Union([Type.String({ maxLength: 2000 }), Type.Null()]),
    completed: Type.Boolean(),
    createdAt: Type.String({ format: "date-time" }),
    updatedAt: Type.String({ format: "date-time" }),
  },
  { additionalProperties: false },
);

export type Task = Static<typeof TaskSchema>;
