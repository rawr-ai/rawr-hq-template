import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { ocBase } from "../../base";
import { INVALID_REGEX } from "../../shared/errors";
import {
  MetadataSearchHitSchema,
  ReindexResultSchema,
  RoleFilterSchema,
  SearchHitSchema,
  SessionListItemSchema,
} from "./schemas";

export const contract = {
  metadata: ocBase
    .meta({ idempotent: true, entity: "search" })
    .input(
      schema(
        Type.Object(
          {
            sessions: Type.Array(SessionListItemSchema),
            needle: Type.String(),
            limit: Type.Number(),
          },
          { additionalProperties: false },
        ),
      ),
    )
    .output(schema(Type.Object({ hits: Type.Array(MetadataSearchHitSchema) }, { additionalProperties: false }))),
  content: ocBase
    .meta({ idempotent: true, entity: "search" })
    .input(
      schema(
        Type.Object(
          {
            sessions: Type.Array(SessionListItemSchema),
            pattern: Type.String({ minLength: 1 }),
            ignoreCase: Type.Boolean(),
            maxMatches: Type.Number(),
            snippetLen: Type.Number(),
            roles: Type.Array(RoleFilterSchema),
            includeTools: Type.Boolean(),
            useIndex: Type.Boolean(),
            indexPath: Type.String({ minLength: 1 }),
          },
          { additionalProperties: false },
        ),
      ),
    )
    .output(schema(Type.Object({ hits: Type.Array(SearchHitSchema) }, { additionalProperties: false })))
    .errors({ INVALID_REGEX }),
  reindex: ocBase
    .meta({ idempotent: false, entity: "search" })
    .input(
      schema(
        Type.Object(
          {
            sessions: Type.Array(
              Type.Object(
                {
                  path: Type.String({ minLength: 1 }),
                  source: Type.Optional(Type.Union([Type.Literal("claude"), Type.Literal("codex")])),
                },
                { additionalProperties: false },
              ),
            ),
            roles: Type.Array(RoleFilterSchema),
            includeTools: Type.Boolean(),
            indexPath: Type.String({ minLength: 1 }),
            limit: Type.Number(),
          },
          { additionalProperties: false },
        ),
      ),
    )
    .output(schema(ReindexResultSchema)),
  clearIndex: ocBase
    .meta({ idempotent: false, entity: "search" })
    .input(schema(Type.Object({ indexPath: Type.String({ minLength: 1 }), path: Type.Optional(Type.String({ minLength: 1 })) }, { additionalProperties: false })))
    .output(schema(Type.Object({ cleared: Type.Boolean() }, { additionalProperties: false }))),
};
