import { type Static, Type } from "typebox";

/** Runtime schema for one admitted Example Todo entity identifier. */
export const TodoIdentifierSchema = Type.String({
  format: "uuid",
  description: "Stable UUID identifying one Example Todo domain entity.",
});

/** UUID-shaped identifier shared by task, tag, and assignment records. */
export type TodoIdentifier = Static<typeof TodoIdentifierSchema>;
