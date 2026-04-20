import { type Static, Type } from "typebox";
import { SessionListItemSchema } from "../../shared/entities";

/**
 * search module entities.
 *
 * @remarks
 * These are shared between the contract (procedure IO) and the router
 * (implementation). Keeping them here avoids importing from `contract.ts`
 * inside helpers/routers.
 */

export const MetadataSearchHitSchema = Type.Object(
  {
    ...SessionListItemSchema.properties,
    matchScore: Type.Number(),
  },
  { additionalProperties: false },
);

export type MetadataSearchHit = Static<typeof MetadataSearchHitSchema>;

export const SearchHitSchema = Type.Object(
  {
    ...SessionListItemSchema.properties,
    matchCount: Type.Number(),
    matchSnippet: Type.String(),
  },
  { additionalProperties: false },
);

export type SearchHit = Static<typeof SearchHitSchema>;

export const ReindexResultSchema = Type.Object(
  {
    indexed: Type.Number(),
    total: Type.Number(),
  },
  { additionalProperties: false },
);

export type ReindexResult = Static<typeof ReindexResultSchema>;

