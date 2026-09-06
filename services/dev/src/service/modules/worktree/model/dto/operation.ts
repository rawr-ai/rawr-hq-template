import { type Static, Type } from "typebox";
import { MutationInputFields, ResultFields } from "../../../../model/dto";

/** Explicit cleanup target and protection policy. */
export const WorktreeCleanupInputSchema = Type.Object(
  {
    ...MutationInputFields,
    prefix: Type.String({ minLength: 1, pattern: "^[^\\u0000]+$" }),
    trunk: Type.String({ minLength: 1, pattern: "^[^\\u0000]+$" }),
    mergedOnly: Type.Optional(Type.Boolean()),
    pinnedPaths: Type.Optional(Type.Array(Type.String({ minLength: 1, pattern: "^[^\\u0000]+$" }))),
    pinnedBranches: Type.Optional(
      Type.Array(Type.String({ minLength: 1, pattern: "^[^\\u0000]+$" }))
    ),
  },
  { additionalProperties: false }
);

/** Actual admitted candidates and successful removals, with exact command failure evidence. */
export const WorktreeCleanupResultSchema = Type.Object(
  {
    ...ResultFields,
    kind: Type.Union([
      Type.Literal("Planned"),
      Type.Literal("Refused"),
      Type.Literal("Applied"),
      Type.Literal("Failed"),
    ]),
    candidates: Type.Array(
      Type.Object({ path: Type.String(), branch: Type.String() }, { additionalProperties: false })
    ),
    skipped: Type.Array(
      Type.Object({ path: Type.String(), reason: Type.String() }, { additionalProperties: false })
    ),
    removed: Type.Array(Type.String()),
  },
  { additionalProperties: false }
);

export type WorktreeCleanupInput = Static<typeof WorktreeCleanupInputSchema>;
export type WorktreeCleanupResult = Static<typeof WorktreeCleanupResultSchema>;
