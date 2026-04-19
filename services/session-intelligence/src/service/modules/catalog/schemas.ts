import { type Static, Type } from "typebox";
import {
  SessionListItemSchema,
  SessionMetadataSchema,
  SessionSourceFilterSchema,
  SessionSourceSchema,
  SessionStatusSchema,
} from "../../shared/schemas";

export { SessionListItemSchema, SessionSourceFilterSchema };

export type SessionListItem = Static<typeof SessionListItemSchema>;
export type SessionSourceFilter = Static<typeof SessionSourceFilterSchema>;

export const SessionFiltersSchema = Type.Object(
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

export const ResolveResultSchema = Type.Object(
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
