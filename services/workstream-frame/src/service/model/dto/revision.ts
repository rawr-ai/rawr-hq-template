/**
 * @fileoverview Revision schema — one line of work-stream truth.
 *
 * @remarks
 * A revision is a whole coherent version of the work stream, not of one item
 * in it. Forking one gives somewhere to try a change — reshaping the frame,
 * resolving a blocker speculatively, letting two agents work without colliding
 * — without that work being visible as truth until it is promoted.
 *
 * The substrate supplies the isolation and the promotion. What lives here is
 * only the vocabulary: which line is committed, which are candidates, and what
 * happened to the ones that were not promoted.
 */
import { type Static, Type } from "typebox";

/** Lifecycle position of one line of truth. */
export const RevisionStatusSchema = Type.Union(
  [
    Type.Literal("committed", { description: "The accepted state of the work stream." }),
    Type.Literal("candidate", { description: "Open, isolated, not yet promoted." }),
    Type.Literal("promoted", { description: "Folded into the committed line." }),
    Type.Literal("abandoned", { description: "Explicitly set aside. Its history remains." }),
  ],
  { description: "Where a revision sits in its lifecycle." }
);

/** Structural type for a revision status. */
export type RevisionStatus = Static<typeof RevisionStatusSchema>;

/** One line of work-stream truth. */
export const RevisionSchema = Type.Object(
  {
    revision: Type.String({ minLength: 1, description: "Revision name." }),
    status: RevisionStatusSchema,
    t: Type.Number({ minimum: 0, description: "Current position of this line." }),
    committed: Type.Boolean({ description: "Whether this is the committed line." }),
  },
  { additionalProperties: false, description: "One revision of the work stream." }
);

/** Structural type for one revision view. */
export type RevisionView = Static<typeof RevisionSchema>;

/** Outcome of folding a candidate into the committed line. */
export const PromotionSchema = Type.Object(
  {
    revision: Type.String({ description: "Candidate that was promoted." }),
    into: Type.String({ description: "Line it was folded into." }),
    t: Type.Number({ minimum: 0, description: "Committed position after promotion." }),
    copied: Type.Number({ minimum: 0, description: "Commits carried across." }),
    conflicts: Type.Number({
      minimum: 0,
      description: "Subjects both lines wrote after diverging. Reported, never resolved here.",
    }),
    fastForward: Type.Boolean({
      description: "True when the committed line had not advanced since the fork.",
    }),
  },
  { additionalProperties: false, description: "What promoting a candidate did." }
);

/** Structural type for a promotion receipt. */
export type PromotionView = Static<typeof PromotionSchema>;
