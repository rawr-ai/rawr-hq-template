import { type Static, Type } from "typebox";
import {
  RoleFilterSchema,
  SessionListItemSchema,
  SessionSourceFilterSchema,
} from "../../shared/schemas";

export {
  RoleFilterSchema,
  SessionListItemSchema,
  SessionSourceFilterSchema,
};

export type RoleFilter = Static<typeof RoleFilterSchema>;
export type SessionListItem = Static<typeof SessionListItemSchema>;
export type SessionSourceFilter = Static<typeof SessionSourceFilterSchema>;

export const SearchHitSchema = Type.Object(
  {
    ...SessionListItemSchema.properties,
    matchCount: Type.Number(),
    matchSnippet: Type.String(),
  },
  { additionalProperties: false },
);
export type SearchHit = Static<typeof SearchHitSchema>;

export const MetadataSearchHitSchema = Type.Object(
  {
    ...SessionListItemSchema.properties,
    matchScore: Type.Number(),
  },
  { additionalProperties: false },
);
export type MetadataSearchHit = Static<typeof MetadataSearchHitSchema>;

export const ReindexResultSchema = Type.Object(
  {
    indexed: Type.Number(),
    total: Type.Number(),
  },
  { additionalProperties: false },
);
export type ReindexResult = Static<typeof ReindexResultSchema>;
