import { type Static, Type } from "typebox";

/** Worktree identity reported by native NUL-delimited Git porcelain. */
export const WorktreeSchema = Type.Object(
  {
    path: Type.String(),
    branch: Type.Union([Type.String(), Type.Null()]),
    detached: Type.Boolean(),
    locked: Type.Boolean(),
  },
  { additionalProperties: false }
);

export type Worktree = Static<typeof WorktreeSchema>;
