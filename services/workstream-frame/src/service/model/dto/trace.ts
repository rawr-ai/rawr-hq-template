/**
 * @fileoverview Trace schema — how one item came to be where it is.
 *
 * @remarks
 * The frame can already answer *why is this item blocked* from position and
 * tags. It could not answer *how did this item get here*, which is the question
 * a work stream exists to make answerable.
 *
 * Every transition is a durable node carrying its own time, so a trace is one
 * query rather than a scan across positions. A mutable tracker cannot produce
 * this at all: it would have to have kept a changelog on the side, and that
 * changelog would be free to disagree with the state.
 */
import { type Static, Type } from "typebox";

/** One recorded transition in an item's life. */
export const TraceEventSchema = Type.Object(
  {
    at: Type.String({ description: "When the transition was recorded." }),
    kind: Type.Union(
      [
        Type.Literal("admitted", { description: "The item entered the frame." }),
        Type.Literal("cleared", { description: "The item cleared one boundary." }),
        Type.Literal("peeled-off", { description: "A refusal became a new item." }),
        Type.Literal("resolved", { description: "A derived item was answered." }),
      ],
      { description: "What kind of transition this was." }
    ),
    boundary: Type.Union([Type.String(), Type.Null()], {
      description: "Durable identity of the boundary involved, or null.",
    }),
    requires: Type.Union([Type.String(), Type.Null()], {
      description: "Tag at stake in this transition, or null.",
    }),
    subject: Type.Union([Type.String(), Type.Null()], {
      description: "Other item involved — the peel-off, or the parent it answered.",
    }),
    note: Type.Union([Type.String(), Type.Null()], {
      description: "Why, when a reason was recorded.",
    }),
  },
  { additionalProperties: false, description: "One recorded transition." }
);

/** Structural type for one trace event. */
export type TraceEvent = Static<typeof TraceEventSchema>;
