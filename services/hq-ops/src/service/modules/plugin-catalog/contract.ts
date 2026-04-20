import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { ocBase } from "../../base";
import {
  WorkspacePluginCatalogEntrySchema,
  WorkspacePluginKindSchema,
} from "../../shared/entities/workspace-plugin-catalog";

/**
 * Public HQ plugin catalog API.
 *
 * This contract is the service boundary for headquarters-owned plugin discovery:
 * projections can ask what plugins exist or resolve a user-facing id, but the
 * root layout, manifest interpretation, and capability eligibility rules stay
 * inside HQ Ops.
 */
export const contract = {
  /**
   * Lists canonical workspace plugins, optionally narrowed by kind, so command
   * surfaces can render or orchestrate without reimplementing catalog policy.
   */
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
  /**
   * Resolves package name, directory name, or catalog id to one canonical plugin
   * entry and reports kind mismatches as service data instead of CLI exceptions.
   */
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
