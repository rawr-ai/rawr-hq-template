import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { ocBase } from "../../base";
import {
  SourceContentSchema,
  SourcePluginSchema,
  SyncRunResultSchema,
} from "../../shared/schemas";

export const contract = {
  runSync: ocBase
    .meta({ idempotent: false, entity: "execution" })
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
            dryRun: Type.Boolean(),
          },
          { additionalProperties: false },
        ),
      ),
    )
    .output(schema(SyncRunResultSchema)),
};
