import type { BaseMetadata } from "@habitat-ai/rawr-hq-sdk";
import { defineMeta } from "@orpc/contract";

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

/** Service-wide metadata inherited by every Example Todo procedure. */
export const metadataDefaults: TodoProcedureMetadata = {
  idempotent: true,
  domain: "todo",
  audience: "internal",
  audit: "basic",
  entity: "service",
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
