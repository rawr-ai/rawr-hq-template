/**
 * @fileoverview Settlement schema — what a push concluded about the stream.
 *
 * @remarks
 * A boolean "nothing moved" answer conflates two situations that demand
 * opposite responses: a stream where every item finished, and a stream where
 * every item is stuck waiting on someone. Both are quiet. Only one is done.
 *
 * Reporting them apart is the whole reason this schema exists. An agent driving
 * the iterator asks exactly one question after each turn — *do I keep going?* —
 * and this is the answer.
 */
import { type Static, Type } from "typebox";

/** What the last turn of the iterator concluded about the stream as a whole. */
export const SettlementSchema = Type.Union(
  [
    Type.Literal("advancing", {
      description: "Something moved. Push again.",
    }),
    Type.Literal("converged", {
      description: "Nothing moved because every item cleared every boundary. The work is done.",
    }),
    Type.Literal("stalled", {
      description:
        "Nothing moved because work is outstanding that the frame cannot supply for itself. " +
        "Pushing again changes nothing; resolving a peel-off does.",
    }),
  ],
  { description: "Settlement state of the stream after one push." }
);

/** Structural type for the settlement discriminator. */
export type Settlement = Static<typeof SettlementSchema>;
