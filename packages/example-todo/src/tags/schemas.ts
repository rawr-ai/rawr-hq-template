import { type Static, Type } from "typebox";

export const TagSchema = Type.Object(
  {
    id: Type.String({ format: "uuid" }),
    name: Type.String({ minLength: 1, maxLength: 50 }),
    color: Type.String({ pattern: "^#[0-9a-fA-F]{6}$" }),
    createdAt: Type.String({ format: "date-time" }),
  },
  { additionalProperties: false },
);

export type Tag = Static<typeof TagSchema>;
