import { schema } from "@rawr/hq-sdk";
import { type Static, Type } from "typebox";
import { ocBase } from "../../base";
import { SESSION_NOT_FOUND, UNKNOWN_SESSION_FORMAT } from "../../shared/errors";
import {
  SessionMetadataSchema,
  SessionListItemSchema,
  SessionSourceFilterSchema,
  SessionSourceSchema,
  SessionStatusSchema,
} from "../../shared/entities";

const SessionFiltersSchema = Type.Object(
  {
    project: Type.Optional(Type.String()),
    cwdContains: Type.Optional(Type.String()),
    branch: Type.Optional(Type.String()),
    model: Type.Optional(Type.String()),
    since: Type.Optional(Type.String()),
    until: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);
export type SessionFilters = Static<typeof SessionFiltersSchema>;

const ResolveResultSchema = Type.Object(
  {
    resolved: Type.Object(
      {
        path: Type.String(),
        source: SessionSourceSchema,
        status: Type.Optional(SessionStatusSchema),
        modified: Type.String(),
        sizeBytes: Type.Number(),
      },
      { additionalProperties: false },
    ),
    metadata: SessionMetadataSchema,
  },
  { additionalProperties: false },
);
export type ResolveResult = Static<typeof ResolveResultSchema>;

export const contract = {
  list: ocBase
    .meta({ idempotent: true, entity: "catalog" })
    .input(
      schema(
        Type.Object(
          {
            source: SessionSourceFilterSchema,
            limit: Type.Number(),
            filters: Type.Optional(SessionFiltersSchema),
          },
          { additionalProperties: false },
        ),
      ),
    )
    .output(schema(Type.Object({ sessions: Type.Array(SessionListItemSchema) }, { additionalProperties: false }))),
  resolve: ocBase
    .meta({ idempotent: true, entity: "catalog" })
    .input(
      schema(
        Type.Object(
          {
            session: Type.String({ minLength: 1 }),
            source: SessionSourceFilterSchema,
          },
          { additionalProperties: false },
        ),
      ),
    )
    .output(schema(ResolveResultSchema))
    .errors({ SESSION_NOT_FOUND, UNKNOWN_SESSION_FORMAT }),
};
