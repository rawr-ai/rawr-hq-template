/**
 * @fileoverview Streams-module boundary contract.
 *
 * @remarks
 * Five operations, each small:
 * - `open` declares the frame's shape.
 * - `admit` puts work into the frame.
 * - `push` is the iterator.
 * - `resolve` closes a feedback loop.
 * - `inspect` reads durable truth, optionally as it stood at an earlier `t`.
 *
 * `inspect.at` is the whole temporal claim of this experiment: the same call at
 * two positions returns two different worlds.
 *
 * @agents
 * Extend capability by updating this contract first, then implementing handlers
 * in `router.ts`. Keep this file free of execution logic.
 */
import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { ocBase } from "../../base";
import {
  ITEM_ALREADY_EXISTS,
  ITEM_NOT_DERIVED,
  ITEM_NOT_FOUND,
  LEDGER_UNAVAILABLE,
  READ_ONLY_MODE,
  STREAM_ALREADY_EXISTS,
  STREAM_NOT_FOUND,
} from "../../model/errors";
import { AdvanceSchema, BoundarySchema, ItemSchema, StreamSchema } from "../../model/schema";

const StreamId = Type.String({
  minLength: 1,
  maxLength: 200,
  description: "Caller-facing stream identifier.",
});

const ItemId = Type.String({
  minLength: 1,
  maxLength: 200,
  description: "Caller-facing item identifier, unique within the stream.",
});

/** Caller-visible boundary for every stream procedure in this module. */
export const contract = {
  open: ocBase
    .meta({ idempotent: false, entity: "stream" })
    .input(
      schema(
        Type.Object(
          {
            streamId: StreamId,
            boundaries: Type.Array(BoundarySchema, {
              minItems: 1,
              maxItems: 32,
              description: "The frame's shape, in the order work must clear it.",
            }),
          },
          { additionalProperties: false, description: "Declare a new frame." }
        )
      )
    )
    .output(schema(StreamSchema))
    .errors({ READ_ONLY_MODE, STREAM_ALREADY_EXISTS, LEDGER_UNAVAILABLE }),

  admit: ocBase
    .meta({ idempotent: false, entity: "item" })
    .input(
      schema(
        Type.Object(
          {
            streamId: StreamId,
            itemId: ItemId,
            title: Type.String({ minLength: 1, maxLength: 500 }),
            tags: Type.Optional(
              Type.Array(Type.String({ minLength: 1, maxLength: 200 }), {
                maxItems: 64,
                description: "Tags the item carries on admission.",
              })
            ),
          },
          { additionalProperties: false, description: "Put one item into the frame." }
        )
      )
    )
    .output(schema(ItemSchema))
    .errors({ READ_ONLY_MODE, STREAM_NOT_FOUND, ITEM_ALREADY_EXISTS, LEDGER_UNAVAILABLE }),

  push: ocBase
    .meta({ idempotent: false, entity: "stream" })
    .input(
      schema(
        Type.Object(
          { streamId: StreamId },
          {
            additionalProperties: false,
            description: "Advance every item as far as the frame allows.",
          }
        )
      )
    )
    .output(
      schema(
        Type.Object(
          {
            streamId: StreamId,
            t: Type.Number({ description: "Ledger position after the push." }),
            advances: Type.Array(AdvanceSchema),
            atEquilibrium: Type.Boolean({
              description: "True when no item moved and no new item was peeled off.",
            }),
          },
          { additionalProperties: false, description: "What one turn of the iterator did." }
        )
      )
    )
    .errors({ READ_ONLY_MODE, STREAM_NOT_FOUND, LEDGER_UNAVAILABLE }),

  resolve: ocBase
    .meta({ idempotent: false, entity: "item" })
    .input(
      schema(
        Type.Object(
          { streamId: StreamId, itemId: ItemId },
          {
            additionalProperties: false,
            description: "Resolve a derived item, granting its tag to its parent.",
          }
        )
      )
    )
    .output(schema(ItemSchema))
    .errors({
      READ_ONLY_MODE,
      STREAM_NOT_FOUND,
      ITEM_NOT_FOUND,
      ITEM_NOT_DERIVED,
      LEDGER_UNAVAILABLE,
    }),

  inspect: ocBase
    .meta({ idempotent: true, entity: "stream" })
    .input(
      schema(
        Type.Object(
          {
            streamId: StreamId,
            at: Type.Optional(
              Type.Number({
                minimum: 0,
                description: "Observe the stream exactly as it stood at this ledger position.",
              })
            ),
          },
          { additionalProperties: false, description: "Read durable stream truth." }
        )
      )
    )
    .output(
      schema(
        Type.Object(
          {
            stream: StreamSchema,
            head: Type.Number({ description: "Current ledger position." }),
            observedAt: Type.Number({ description: "Position this view was reconstructed at." }),
          },
          { additionalProperties: false, description: "One stream observation." }
        )
      )
    )
    .errors({ STREAM_NOT_FOUND, LEDGER_UNAVAILABLE }),
};
