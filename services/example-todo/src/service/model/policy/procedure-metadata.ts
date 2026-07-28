import { defineMeta } from "@orpc/contract";
import type { BaseMetadata } from "@rawr/hq-sdk";

/** Static procedure-policy vocabulary owned by the Example Todo service. */
export type TodoProcedureMetadata = BaseMetadata & {
  audit?: "none" | "basic" | "full";
  entity?: "service" | "task" | "tag" | "assignment";
  analytics?: {
    readonly layer: "module" | "procedure";
    readonly module?: "assignments" | "tags";
    readonly operation?: "tags.create";
  };
};

const [attachTodoProcedureMetadata, readTodoProcedureMetadata] = defineMeta<
  "rawr.procedure",
  TodoProcedureMetadata
>("rawr.procedure", (incoming, current) => ({
  ...current,
  ...incoming,
}));

/** Attaches Example Todo policy metadata through oRPC's native metadata plugin. */
export const todoProcedureMetadata = attachTodoProcedureMetadata;

/** Reads the typed Example Todo policy projected onto a procedure contract. */
export const getTodoProcedureMetadata = readTodoProcedureMetadata;
