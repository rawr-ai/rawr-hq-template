import { schema } from "@rawr/hq-sdk";
import { ORPCError, type ErrorMapItem } from "@orpc/server";
import { Type } from "typebox";

export type CorpusWorkspaceErrorCode =
  | "INVALID_CONVERSATION_JSON"
  | "INVALID_CONVERSATION_EXPORT";

export class CorpusWorkspaceError extends Error {
  constructor(
    public readonly code: CorpusWorkspaceErrorCode,
    public readonly sourcePath: string,
    public readonly reason: string,
  ) {
    super(`${code}: ${sourcePath} (${reason})`);
    this.name = "CorpusWorkspaceError";
  }
}

const CorpusErrorData = schema(
  Type.Object(
    {
      path: Type.String({ minLength: 1 }),
      reason: Type.String({ minLength: 1 }),
    },
    { additionalProperties: false },
  ),
);

export const INVALID_CONVERSATION_JSON: ErrorMapItem<typeof CorpusErrorData> = {
  status: 400,
  message: "Conversation JSON could not be parsed",
  data: CorpusErrorData,
} as const;

export const INVALID_CONVERSATION_EXPORT: ErrorMapItem<typeof CorpusErrorData> = {
  status: 400,
  message: "Conversation export shape is invalid",
  data: CorpusErrorData,
} as const;

export function rethrowAsOrpcError(error: unknown): never {
  if (error instanceof CorpusWorkspaceError) {
    throw new ORPCError(error.code, {
      status: error.code === "INVALID_CONVERSATION_JSON" ? 400 : 400,
      data: {
        path: error.sourcePath,
        reason: error.reason,
      },
    });
  }

  throw error;
}
