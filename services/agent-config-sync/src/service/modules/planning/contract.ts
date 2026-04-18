import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { ocBase } from "../../base";
import {
  SourceContentSchema,
  SourcePluginSchema,
  SyncAgentSelectionSchema,
  SyncItemResultSchema,
  SyncRunResultSchema,
  SyncScopeSchema,
  TargetHomesSchema,
  WorkspaceSkipSchema,
} from "../../shared/schemas";

export const contract = {
  previewSync: ocBase
    .meta({ idempotent: true, entity: "planning" })
    .input(
      schema(
        Type.Object(
          {
            sourcePlugin: SourcePluginSchema,
            content: SourceContentSchema,
            codexHomes: Type.Array(Type.String({ minLength: 1 })),
            claudeHomes: Type.Array(Type.String({ minLength: 1 })),
            includeCodex: Type.Boolean(),
            includeClaude: Type.Boolean(),
            includeAgentsInCodex: Type.Optional(Type.Boolean()),
            includeAgentsInClaude: Type.Optional(Type.Boolean()),
            force: Type.Boolean(),
            gc: Type.Boolean(),
          },
          { additionalProperties: false },
        ),
      ),
    )
    .output(schema(SyncRunResultSchema)),
  assessWorkspace: ocBase
    .meta({ idempotent: true, entity: "planning" })
    .input(
      schema(
        Type.Object(
          {
            workspaceRoot: Type.String({ minLength: 1 }),
            syncable: Type.Array(
              Type.Object(
                {
                  sourcePlugin: SourcePluginSchema,
                  content: SourceContentSchema,
                },
                { additionalProperties: false },
              ),
            ),
            skipped: Type.Array(WorkspaceSkipSchema),
            includeMetadata: Type.Boolean(),
            scope: SyncScopeSchema,
            agent: SyncAgentSelectionSchema,
            targetHomes: TargetHomesSchema,
            includeAgentsInCodex: Type.Optional(Type.Boolean()),
            includeAgentsInClaude: Type.Optional(Type.Boolean()),
          },
          { additionalProperties: false },
        ),
      ),
    )
    .output(
      schema(
        Type.Object(
          {
            status: Type.Union([
              Type.Literal("IN_SYNC"),
              Type.Literal("DRIFT_DETECTED"),
              Type.Literal("CONFLICTS"),
            ]),
            includeMetadata: Type.Boolean(),
            scope: SyncScopeSchema,
            summary: Type.Object(
              {
                totalPlugins: Type.Number(),
                totalTargets: Type.Number(),
                totalConflicts: Type.Number(),
                totalMaterialChanges: Type.Number(),
                totalMetadataChanges: Type.Number(),
                totalDriftItems: Type.Number(),
              },
              { additionalProperties: false },
            ),
            skipped: Type.Array(WorkspaceSkipSchema),
            plugins: Type.Array(
              Type.Object(
                {
                  dirName: Type.String({ minLength: 1 }),
                  absPath: Type.String({ minLength: 1 }),
                  conflicts: Type.Number(),
                  materialChanges: Type.Number(),
                  metadataChanges: Type.Number(),
                  driftItems: Type.Array(
                    Type.Object(
                      {
                        action: SyncItemResultSchema.properties.action,
                        kind: SyncItemResultSchema.properties.kind,
                        target: Type.String({ minLength: 1 }),
                        message: Type.Optional(Type.String({ minLength: 1 })),
                      },
                      { additionalProperties: false },
                    ),
                  ),
                },
                { additionalProperties: false },
              ),
            ),
          },
          { additionalProperties: false },
        ),
      ),
    ),
};
