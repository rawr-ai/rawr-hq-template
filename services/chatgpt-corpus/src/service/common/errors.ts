import type { ErrorMapItem } from "@orpc/server";
import { standard } from "@rawr/typebox-adapter";
import { Type } from "typebox";

const CorpusErrorData = standard(
  Type.Object(
    {
      path: Type.String({ minLength: 1 }),
      reason: Type.String({ minLength: 1 }),
    },
    { additionalProperties: false }
  )
);

export const INVALID_CONVERSATION_JSON: ErrorMapItem<typeof CorpusErrorData> = {
  message: "Conversation JSON could not be parsed",
  data: CorpusErrorData,
} as const;

export const INVALID_CONVERSATION_EXPORT: ErrorMapItem<typeof CorpusErrorData> = {
  message: "Conversation export shape is invalid",
  data: CorpusErrorData,
} as const;
