import { type Static, Type } from "typebox";
import { MutationInputFields, ResultFields } from "../../../../model/dto";

/** Optional explicit native upstream pair; omission uses configured Git upstream. */
export const RepoSyncInputSchema = Type.Object(
  {
    ...MutationInputFields,
    upstream: Type.Optional(
      Type.Object(
        {
          remote: Type.String({ minLength: 1, pattern: "^[^\\u0000]+$" }),
          branch: Type.String({ minLength: 1, pattern: "^[^\\u0000]+$" }),
        },
        { additionalProperties: false }
      )
    ),
  },
  { additionalProperties: false }
);

/** Exact observations around a planned or attempted fast-forward update. */
export const RepoSyncResultSchema = Type.Object(
  {
    ...ResultFields,
    kind: Type.Union([
      Type.Literal("Planned"),
      Type.Literal("Refused"),
      Type.Literal("Updated"),
      Type.Literal("Failed"),
    ]),
    branch: Type.Union([Type.String(), Type.Null()]),
    upstream: Type.Union([
      Type.Null(),
      Type.Object(
        {
          remote: Type.String(),
          branch: Type.String(),
          source: Type.Union([Type.Literal("configured"), Type.Literal("explicit")]),
        },
        { additionalProperties: false }
      ),
    ]),
    before: Type.Union([Type.String(), Type.Null()]),
    after: Type.Union([Type.String(), Type.Null()]),
  },
  { additionalProperties: false }
);

export type RepoSyncInput = Static<typeof RepoSyncInputSchema>;
export type RepoSyncResult = Static<typeof RepoSyncResultSchema>;
