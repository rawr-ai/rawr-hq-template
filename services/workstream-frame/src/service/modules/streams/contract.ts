/**
 * @fileoverview Streams-module boundary contract.
 *
 * @remarks
 * Seven operations, each small:
 * - `open` declares the frame's shape.
 * - `admit` puts work into the frame.
 * - `push` is the iterator.
 * - `resolve` closes a feedback loop.
 * - `close` seals the stream against further work.
 * - `inspect` reads durable truth, optionally as it stood at an earlier `t`.
 * - `trace` reads how one item came to be where it is.
 *
 * Every operation takes an optional `revision`. Omitting it means the committed
 * revision, so the default path is always product truth.
 *
 * `inspect.at` is the temporal claim of this experiment: the same call at two
 * positions returns two different worlds. `trace` is its companion — the path
 * between those worlds is itself durable, not reconstructed by inference.
 *
 * @agents
 * Extend capability by updating this contract first, then implementing handlers
 * in `router/`. Keep this file free of execution logic.
 */
import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { ocBase } from "../../base";
import { AdvanceSchema } from "../../model/dto/advance";
import { BoundaryInputSchema } from "../../model/dto/boundary";
import { ItemSchema } from "../../model/dto/item";
import { SettlementSchema } from "../../model/dto/settlement";
import { StreamSchema } from "../../model/dto/stream";
import { TraceEventSchema } from "../../model/dto/trace";
import {
  ITEM_ALREADY_EXISTS,
  ITEM_NOT_DERIVED,
  ITEM_NOT_FOUND,
  LEDGER_UNAVAILABLE,
  READ_ONLY_MODE,
  STREAM_ALREADY_EXISTS,
  STREAM_CLOSED,
  STREAM_NOT_FOUND,
} from "../../model/errors/boundary-errors";

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

const Revision = Type.Optional(
  Type.String({
    minLength: 1,
    maxLength: 120,
    description: "Revision to address. Omit for the committed revision.",
  })
);

const Note = Type.Optional(
  Type.String({
    maxLength: 2000,
    description: "Why this was done. Recorded durably alongside the transition.",
  })
);

/** Caller-visible boundary for every stream procedure in this module. */
export const contract = {
  open: ocBase
    .meta({ idempotent: false, entity: "stream" })
    .input(
      schema(
        Type.Object(
          {
            streamId: StreamId,
            revision: Revision,
            boundaries: Type.Array(BoundaryInputSchema, {
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
            revision: Revision,
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
    .errors({
      READ_ONLY_MODE,
      STREAM_NOT_FOUND,
      STREAM_CLOSED,
      ITEM_ALREADY_EXISTS,
      LEDGER_UNAVAILABLE,
    }),

  push: ocBase
    .meta({ idempotent: false, entity: "stream" })
    .input(
      schema(
        Type.Object(
          { streamId: StreamId, revision: Revision },
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
            settlement: SettlementSchema,
          },
          { additionalProperties: false, description: "What one turn of the iterator did." }
        )
      )
    )
    .errors({ READ_ONLY_MODE, STREAM_NOT_FOUND, STREAM_CLOSED, LEDGER_UNAVAILABLE }),

  resolve: ocBase
    .meta({ idempotent: false, entity: "item" })
    .input(
      schema(
        Type.Object(
          { streamId: StreamId, revision: Revision, itemId: ItemId, note: Note },
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
      STREAM_CLOSED,
      ITEM_NOT_FOUND,
      ITEM_NOT_DERIVED,
      LEDGER_UNAVAILABLE,
    }),

  close: ocBase
    .meta({ idempotent: false, entity: "stream" })
    .input(
      schema(
        Type.Object(
          { streamId: StreamId, revision: Revision, note: Note },
          {
            additionalProperties: false,
            description: "Seal the stream. Reads keep working; writes stop.",
          }
        )
      )
    )
    .output(schema(StreamSchema))
    .errors({ READ_ONLY_MODE, STREAM_NOT_FOUND, STREAM_CLOSED, LEDGER_UNAVAILABLE }),

  inspect: ocBase
    .meta({ idempotent: true, entity: "stream" })
    .input(
      schema(
        Type.Object(
          {
            streamId: StreamId,
            revision: Revision,
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

  trace: ocBase
    .meta({ idempotent: true, entity: "item" })
    .input(
      schema(
        Type.Object(
          {
            streamId: StreamId,
            revision: Revision,
            itemId: ItemId,
            at: Type.Optional(
              Type.Number({ minimum: 0, description: "Trace as it stood at this position." })
            ),
          },
          { additionalProperties: false, description: "Read one item's whole trajectory." }
        )
      )
    )
    .output(
      schema(
        Type.Object(
          {
            streamId: StreamId,
            itemId: ItemId,
            events: Type.Array(TraceEventSchema, {
              description: "Every recorded transition, oldest first.",
            }),
            observedAt: Type.Number({ description: "Position this trace was reconstructed at." }),
          },
          { additionalProperties: false, description: "How one item came to be where it is." }
        )
      )
    )
    .errors({ STREAM_NOT_FOUND, ITEM_NOT_FOUND, LEDGER_UNAVAILABLE }),
};
