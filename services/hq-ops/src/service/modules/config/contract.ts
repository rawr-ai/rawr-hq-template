import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { ocBase } from "../../base";
import { ConfigLayeredResultSchema, ConfigLoadResultSchema, SyncSourcesSchema } from "./schemas";

const EmptyInputSchema = schema(
  Type.Object(
    {},
    {
      additionalProperties: false,
      description: "No caller input is required.",
    },
  ),
);

const SyncSourceMutationInputSchema = schema(
  Type.Object(
    {
      path: Type.String({ minLength: 1 }),
    },
    {
      additionalProperties: false,
      description: "Absolute or already-resolved sync source path.",
    },
  ),
);

export const contract = {
  getWorkspaceConfig: ocBase
    .meta({ idempotent: true, entity: "config" })
    .input(EmptyInputSchema)
    .output(schema(ConfigLoadResultSchema)),
  getGlobalConfig: ocBase
    .meta({ idempotent: true, entity: "config" })
    .input(EmptyInputSchema)
    .output(schema(ConfigLoadResultSchema)),
  getLayeredConfig: ocBase
    .meta({ idempotent: true, entity: "config" })
    .input(EmptyInputSchema)
    .output(schema(ConfigLayeredResultSchema)),
  listGlobalSyncSources: ocBase
    .meta({ idempotent: true, entity: "config" })
    .input(EmptyInputSchema)
    .output(schema(SyncSourcesSchema)),
  addGlobalSyncSource: ocBase
    .meta({ idempotent: false, entity: "config" })
    .input(SyncSourceMutationInputSchema)
    .output(schema(SyncSourcesSchema)),
  removeGlobalSyncSource: ocBase
    .meta({ idempotent: false, entity: "config" })
    .input(SyncSourceMutationInputSchema)
    .output(schema(SyncSourcesSchema)),
};
