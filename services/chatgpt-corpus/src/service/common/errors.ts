import { schema } from "@rawr/hq-sdk";
import type { ErrorMapItem } from "@orpc/server";
import { Type } from "typebox";

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
