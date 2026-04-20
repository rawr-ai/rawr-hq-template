import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { ocBase } from "../../base";
import {
  WorkspacePluginCatalogEntrySchema,
  WorkspacePluginKindSchema,
} from "./entities";

export const contract = {
  listWorkspacePlugins: ocBase
    .meta({ idempotent: true, entity: "pluginCatalog" })
    .input(schema(Type.Object(
      {
        workspaceRoot: Type.Optional(Type.String({ minLength: 1 })),
        kind: Type.Optional(WorkspacePluginKindSchema),
      },
      { additionalProperties: false },
    )))
    .output(schema(Type.Object(
      {
        workspaceRoot: Type.String({ minLength: 1 }),
        plugins: Type.Array(WorkspacePluginCatalogEntrySchema),
        excludedCount: Type.Number({ minimum: 0 }),
      },
      { additionalProperties: false },
    ))),
  resolveWorkspacePlugin: ocBase
    .meta({ idempotent: true, entity: "pluginCatalog" })
    .input(schema(Type.Object(
      {
        workspaceRoot: Type.Optional(Type.String({ minLength: 1 })),
        inputId: Type.String({ minLength: 1 }),
        requiredKind: Type.Optional(WorkspacePluginKindSchema),
      },
      { additionalProperties: false },
    )))
    .output(schema(Type.Object(
      {
        workspaceRoot: Type.String({ minLength: 1 }),
        status: Type.Union([Type.Literal("found"), Type.Literal("not_found"), Type.Literal("kind_mismatch")]),
        plugin: Type.Optional(WorkspacePluginCatalogEntrySchema),
        actualKind: Type.Optional(WorkspacePluginKindSchema),
        knownPluginIds: Type.Array(Type.String({ minLength: 1 })),
      },
      { additionalProperties: false },
    ))),
};

export type PluginCatalogModuleContract = typeof contract;
