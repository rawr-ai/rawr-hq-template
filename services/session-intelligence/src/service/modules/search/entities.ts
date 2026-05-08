import { type Static, Type } from "typebox";
import { SessionListItemSchema } from "../../common/entities";

/**
 * search module entities.
 *
 * @remarks
 * These are shared between the contract (procedure IO) and the router
 * (implementation). Keeping them here avoids importing from `contract.ts`
 * inside helpers/routers.
 */

export const DEFAULT_FACET_CANDIDATE_LIMIT = 250;
export const MAX_FACET_CANDIDATE_LIMIT = 50_000;

export const SessionFacetsSchema = Type.Object(
  {
    xmlBlockTags: Type.Array(Type.String()),
    directives: Type.Array(Type.String()),
    toolCalls: Type.Array(Type.String()),
    topLevelTypes: Type.Array(Type.String()),
    payloadTypes: Type.Array(Type.String()),
  },
  { additionalProperties: false },
);

export type SessionFacets = Static<typeof SessionFacetsSchema>;

export const SessionFacetFiltersSchema = Type.Object(
  {
    tags: Type.Optional(Type.Array(Type.String())),
    directives: Type.Optional(Type.Array(Type.String())),
    tools: Type.Optional(Type.Array(Type.String())),
    payloadTypes: Type.Optional(Type.Array(Type.String())),
    topTypes: Type.Optional(Type.Array(Type.String())),
  },
  { additionalProperties: false },
);

export type SessionFacetFilters = Static<typeof SessionFacetFiltersSchema>;

export const FacetSearchHitSchema = Type.Object(
  {
    ...SessionListItemSchema.properties,
    facets: Type.Optional(SessionFacetsSchema),
  },
  { additionalProperties: false },
);

export type FacetSearchHit = Static<typeof FacetSearchHitSchema>;

export const MetadataSearchHitSchema = Type.Object(
  {
    ...SessionListItemSchema.properties,
    matchScore: Type.Number(),
    facets: Type.Optional(SessionFacetsSchema),
  },
  { additionalProperties: false },
);

export type MetadataSearchHit = Static<typeof MetadataSearchHitSchema>;

export const SearchHitSchema = Type.Object(
  {
    ...SessionListItemSchema.properties,
    matchCount: Type.Number(),
    matchSnippet: Type.String(),
    facets: Type.Optional(SessionFacetsSchema),
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
