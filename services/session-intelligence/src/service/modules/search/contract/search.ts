import { procedureMetadata } from "@habitat-ai/rawr-hq-sdk";
import { standard } from "@habitat-ai/typebox-adapter";
import { oc } from "@orpc/contract";
import { type Static, Type } from "typebox";
import { RoleFilterSchema, SessionSourceFilterSchema } from "../../../model/dto";
import { ErrorMessageSchema } from "../../../model/errors";
import {
  DEFAULT_FACET_CANDIDATE_LIMIT,
  FacetSearchHitSchema,
  MAX_FACET_CANDIDATE_LIMIT,
  MetadataSearchHitSchema,
  ReindexResultSchema,
  SearchHitSchema,
  SessionFacetFiltersSchema,
} from "../model/dto";

const SearchSessionFiltersSchema = Type.Object(
  {
    project: Type.Optional(
      Type.String({ description: "Project identity that search candidates must match." })
    ),
    cwdContains: Type.Optional(
      Type.String({ description: "Path fragment required in a candidate working directory." })
    ),
    branch: Type.Optional(
      Type.String({ description: "Git branch identity that search candidates must match." })
    ),
    model: Type.Optional(
      Type.String({ description: "Model identity that search candidates must match." })
    ),
    since: Type.Optional(
      Type.String({ description: "Earliest session modification boundary admitted to search." })
    ),
    until: Type.Optional(
      Type.String({ description: "Latest session modification boundary admitted to search." })
    ),
  },
  { additionalProperties: false }
);

export type MetadataSearchHit = Static<typeof MetadataSearchHitSchema>;
export type SearchHit = Static<typeof SearchHitSchema>;
export type ReindexResult = Static<typeof ReindexResultSchema>;

const CandidateLimitSchema = Type.Optional(
  Type.Integer({
    minimum: 1,
    maximum: MAX_FACET_CANDIDATE_LIMIT,
    default: DEFAULT_FACET_CANDIDATE_LIMIT,
    description: "Maximum candidate sessions inspected while deriving facet-aware results.",
  })
);

/** Search procedure group exposed through the module contract face. */
export const search = {
  metadata: oc
    .meta(procedureMetadata({ idempotent: true, entity: "search" }))
    .input(
      standard(
        Type.Object(
          {
            source: SessionSourceFilterSchema,
            filters: Type.Optional(SearchSessionFiltersSchema),
            needle: Type.String({
              description: "Text matched against normalized session metadata.",
            }),
            limit: Type.Number({
              description:
                "Positive result cap after metadata matching; zero or negative returns every match.",
            }),
            facetFilters: Type.Optional(SessionFacetFiltersSchema),
            includeFacets: Type.Optional(
              Type.Boolean({ description: "Whether each match includes its derived facets." })
            ),
            candidateLimit: CandidateLimitSchema,
          },
          { additionalProperties: false }
        )
      )
    )
    .output(
      standard(
        Type.Object(
          {
            hits: Type.Array(MetadataSearchHitSchema, {
              description: "Bounded metadata matches ordered for caller consumption.",
            }),
          },
          { additionalProperties: false }
        )
      )
    ),
  content: oc
    .meta(procedureMetadata({ idempotent: true, entity: "search" }))
    .input(
      standard(
        Type.Object(
          {
            source: SessionSourceFilterSchema,
            filters: Type.Optional(SearchSessionFiltersSchema),
            limit: Type.Number({
              description:
                "Positive candidate-discovery cap used without facet filters; zero or negative admits all candidates, while facet-filtered search uses candidateLimit.",
            }),
            pattern: Type.String({
              minLength: 1,
              description: "Regular-expression pattern matched against normalized transcript text.",
            }),
            ignoreCase: Type.Boolean({
              description: "Whether transcript pattern matching ignores letter case.",
            }),
            maxMatches: Type.Number({
              description:
                "Positive matching-session cap across the result; zero or negative leaves the result unbounded.",
            }),
            snippetLen: Type.Number({
              description:
                "Maximum surrounding text retained for the first match in each returned session.",
            }),
            roles: Type.Array(RoleFilterSchema, {
              description: "Message roles admitted to transcript matching.",
            }),
            includeTools: Type.Boolean({
              description: "Whether tool messages participate in transcript matching.",
            }),
            useIndex: Type.Boolean({
              description:
                "Whether the service-owned search-text index may supply transcript text.",
            }),
            facetFilters: Type.Optional(SessionFacetFiltersSchema),
            includeFacets: Type.Optional(
              Type.Boolean({ description: "Whether each match includes its derived facets." })
            ),
            candidateLimit: CandidateLimitSchema,
          },
          { additionalProperties: false }
        )
      )
    )
    .output(
      standard(
        Type.Object(
          {
            hits: Type.Array(SearchHitSchema, {
              description: "Bounded transcript matches ordered for caller consumption.",
            }),
          },
          { additionalProperties: false }
        )
      )
    )
    .errors({
      INVALID_REGEX: {
        message: "Invalid search regex",
        data: standard(ErrorMessageSchema),
      },
    }),
  facets: oc
    .meta(procedureMetadata({ idempotent: true, entity: "search" }))
    .input(
      standard(
        Type.Object(
          {
            source: SessionSourceFilterSchema,
            filters: Type.Optional(SearchSessionFiltersSchema),
            facetFilters: SessionFacetFiltersSchema,
            limit: Type.Number({
              description:
                "Positive facet-result cap; zero or negative returns every admitted match.",
            }),
            candidateLimit: CandidateLimitSchema,
            includeFacets: Type.Optional(
              Type.Boolean({ description: "Whether each match includes its derived facets." })
            ),
          },
          { additionalProperties: false }
        )
      )
    )
    .output(
      standard(
        Type.Object(
          {
            hits: Type.Array(FacetSearchHitSchema, {
              description: "Bounded facet matches ordered for caller consumption.",
            }),
          },
          { additionalProperties: false }
        )
      )
    ),
  reindex: oc
    .meta(procedureMetadata({ idempotent: false, entity: "search" }))
    .input(
      standard(
        Type.Object(
          {
            source: SessionSourceFilterSchema,
            filters: Type.Optional(SearchSessionFiltersSchema),
            roles: Type.Array(RoleFilterSchema, {
              description: "Message roles admitted to the rebuilt search-text index.",
            }),
            includeTools: Type.Boolean({
              description: "Whether tool messages are retained in rebuilt search text.",
            }),
            limit: Type.Number({
              description:
                "Positive reindexing cap; zero or negative considers every admitted session.",
            }),
          },
          { additionalProperties: false }
        )
      )
    )
    .output(standard(ReindexResultSchema)),
  clearIndex: oc
    .meta(procedureMetadata({ idempotent: false, entity: "search" }))
    .input(
      standard(
        Type.Object(
          {
            path: Type.Optional(
              Type.String({
                minLength: 1,
                description:
                  "Optional session source path whose cached search text should be cleared.",
              })
            ),
          },
          { additionalProperties: false }
        )
      )
    )
    .output(
      standard(
        Type.Object(
          {
            cleared: Type.Boolean({
              description: "Whether the requested search-index state was cleared.",
            }),
          },
          { additionalProperties: false }
        )
      )
    ),
};
