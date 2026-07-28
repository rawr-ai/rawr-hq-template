import type { BaseMetadata } from "@rawr/hq-sdk";

/** Static procedure-policy vocabulary owned by the Example Todo service. */
export type TodoProcedureMetadata = BaseMetadata & {
  audit?: "none" | "basic" | "full";
  entity?: "service" | "task" | "tag" | "assignment";
};
