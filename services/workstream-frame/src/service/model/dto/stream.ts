/**
 * @fileoverview Stream schema — durable truth for one work stream.
 *
 * @remarks
 * `closedAt` is what separates a settled stream from a finished one. Settlement
 * is an observation about the last push; closure is an assertion about the
 * future. Only the second means the work is over.
 */
import { type Static, Type } from "typebox";
import { BoundarySchema } from "./boundary";
import { ItemSchema } from "./item";

/** Durable truth for one work stream at one observation position. */
export const StreamSchema = Type.Object(
  {
    streamId: Type.String({ minLength: 1, description: "Caller-facing stream identifier." }),
    boundaries: Type.Array(BoundarySchema, { description: "The frame's shape, in order." }),
    items: Type.Array(ItemSchema, { description: "Every item in the stream." }),
    closedAt: Type.Union([Type.String(), Type.Null()], {
      description: "When the stream was sealed against further work, or null while open.",
    }),
    closedNote: Type.Union([Type.String(), Type.Null()], {
      description: "Why the stream was closed, when a reason was given.",
    }),
  },
  { additionalProperties: false, description: "Durable truth for one work stream." }
);

/** Structural type for one stream view. */
export type StreamView = Static<typeof StreamSchema>;
