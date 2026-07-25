/**
 * @fileoverview Stream schema — durable truth for one work stream.
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
  },
  { additionalProperties: false, description: "Durable truth for one work stream." }
);

/** Structural type for one stream view. */
export type StreamView = Static<typeof StreamSchema>;
