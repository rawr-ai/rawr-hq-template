/**
 * @fileoverview Shared oRPC boundary error definitions for workstream-frame.
 *
 * @remarks
 * Export individual reusable error definitions directly so procedures can pass
 * them to `.errors(...)` without an intermediate map wrapper.
 *
 * Note what is *absent*: there is no "item blocked" error. A boundary refusing
 * an item is the frame working correctly, so it is a result, not a failure.
 */
import type { ErrorMapItem } from "@orpc/server";
import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";

const StreamNotFoundData = schema(
  Type.Object(
    {
      streamId: Type.Optional(
        Type.String({ minLength: 1, description: "Stream that was absent." })
      ),
      at: Type.Optional(
        Type.Number({ description: "Ledger position the stream was looked for at." })
      ),
    },
    { additionalProperties: false, description: "Context for STREAM_NOT_FOUND." }
  )
);

const StreamAlreadyExistsData = schema(
  Type.Object(
    {
      streamId: Type.Optional(
        Type.String({ minLength: 1, description: "Stream that already exists." })
      ),
    },
    { additionalProperties: false, description: "Context for STREAM_ALREADY_EXISTS." }
  )
);

const ItemNotFoundData = schema(
  Type.Object(
    {
      streamId: Type.Optional(Type.String({ minLength: 1 })),
      itemId: Type.Optional(Type.String({ minLength: 1, description: "Item that was absent." })),
    },
    { additionalProperties: false, description: "Context for ITEM_NOT_FOUND." }
  )
);

const ItemAlreadyExistsData = schema(
  Type.Object(
    {
      streamId: Type.Optional(Type.String({ minLength: 1 })),
      itemId: Type.Optional(Type.String({ minLength: 1 })),
    },
    { additionalProperties: false, description: "Context for ITEM_ALREADY_EXISTS." }
  )
);

const NotDerivedData = schema(
  Type.Object(
    {
      itemId: Type.Optional(
        Type.String({ minLength: 1, description: "Item that carries no derivation edge." })
      ),
    },
    { additionalProperties: false, description: "Context for ITEM_NOT_DERIVED." }
  )
);

const ReadOnlyModeData = schema(
  Type.Object(
    {
      path: Type.Optional(
        Type.String({ minLength: 1, description: "Procedure blocked by read-only mode." })
      ),
    },
    { additionalProperties: false, description: "Context for READ_ONLY_MODE." }
  )
);

const StreamClosedData = schema(
  Type.Object(
    {
      streamId: Type.Optional(Type.String({ minLength: 1, description: "Stream that is sealed." })),
      closedAt: Type.Optional(Type.String({ description: "When the stream was sealed." })),
    },
    { additionalProperties: false, description: "Context for STREAM_CLOSED." }
  )
);

const RevisionData = schema(
  Type.Object(
    {
      revision: Type.Optional(Type.String({ minLength: 1, description: "Revision named." })),
      committed: Type.Optional(
        Type.String({ description: "Name of the committed revision, for contrast." })
      ),
    },
    { additionalProperties: false, description: "Context for revision errors." }
  )
);

const LedgerUnavailableData = schema(
  Type.Object(
    {
      operation: Type.Optional(Type.String({ description: "Ledger operation that failed." })),
      reason: Type.Optional(Type.String({ description: "Provider-classified failure reason." })),
      detail: Type.Optional(Type.String({ description: "Redacted provider detail." })),
    },
    { additionalProperties: false, description: "Context for LEDGER_UNAVAILABLE." }
  )
);

/** Refuses a read or write against a stream that is not observable at the requested position. */
export const STREAM_NOT_FOUND: ErrorMapItem<typeof StreamNotFoundData> = {
  status: 404,
  message: "Stream not found",
  data: StreamNotFoundData,
} as const;

/** Refuses opening a frame whose identity is already taken. */
export const STREAM_ALREADY_EXISTS: ErrorMapItem<typeof StreamAlreadyExistsData> = {
  status: 409,
  message: "Stream already exists",
  data: StreamAlreadyExistsData,
} as const;

/** Refuses an operation naming an item the stream does not hold. */
export const ITEM_NOT_FOUND: ErrorMapItem<typeof ItemNotFoundData> = {
  status: 404,
  message: "Item not found",
  data: ItemNotFoundData,
} as const;

/** Refuses admitting an item whose identity is already taken in the stream. */
export const ITEM_ALREADY_EXISTS: ErrorMapItem<typeof ItemAlreadyExistsData> = {
  status: 409,
  message: "Item already exists",
  data: ItemAlreadyExistsData,
} as const;

/** Refuses resolving an item that was admitted directly and so owes no tag to a parent. */
export const ITEM_NOT_DERIVED: ErrorMapItem<typeof NotDerivedData> = {
  status: 409,
  message: "Only a derived item can be resolved",
  data: NotDerivedData,
} as const;

/** Refuses any write while the client is configured read-only. */
export const READ_ONLY_MODE: ErrorMapItem<typeof ReadOnlyModeData> = {
  status: 409,
  message: "Write operations are blocked while read-only mode is enabled",
  data: ReadOnlyModeData,
} as const;

/**
 * Refuses work against a stream that has been sealed.
 *
 * @remarks
 * This *is* an error, unlike a boundary refusing an item. A blocked item is the
 * frame working; writing to a closed stream is a caller mistake about what the
 * stream still is.
 */
export const STREAM_CLOSED: ErrorMapItem<typeof StreamClosedData> = {
  status: 409,
  message: "Stream is closed and accepts no further work",
  data: StreamClosedData,
} as const;

/** Refuses an operation naming a revision that does not exist. */
export const REVISION_NOT_FOUND: ErrorMapItem<typeof RevisionData> = {
  status: 404,
  message: "Revision not found",
  data: RevisionData,
} as const;

/** Refuses forking a revision whose name is already taken. */
export const REVISION_ALREADY_EXISTS: ErrorMapItem<typeof RevisionData> = {
  status: 409,
  message: "Revision already exists",
  data: RevisionData,
} as const;

/**
 * Refuses promoting or abandoning the committed revision.
 *
 * @remarks
 * The committed revision is what candidates are promoted *into*. Folding it
 * into itself, or setting it aside, are both category errors rather than
 * operations with a sensible meaning.
 */
export const REVISION_NOT_CANDIDATE: ErrorMapItem<typeof RevisionData> = {
  status: 409,
  message: "Only a candidate revision can be promoted or abandoned",
  data: RevisionData,
} as const;

/** Reports that the ledger substrate could not serve the request, with redacted provider context. */
export const LEDGER_UNAVAILABLE: ErrorMapItem<typeof LedgerUnavailableData> = {
  status: 503,
  message: "The semantic ledger could not serve this request",
  data: LedgerUnavailableData,
} as const;
