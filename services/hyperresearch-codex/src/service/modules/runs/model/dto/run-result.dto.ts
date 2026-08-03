import { type Static, Type } from "typebox";

/** Caller-facing status projected from the Runs module's V8 lifecycle. */
export const V8RunStatusSchema = Type.Union([
  Type.Literal("running"),
  Type.Literal("awaiting_agents"),
  Type.Literal("complete"),
  Type.Literal("blocked"),
]);

/** Caller-facing status projected from the Runs module's V8 lifecycle. */
export type V8RunStatus = Static<typeof V8RunStatusSchema>;
