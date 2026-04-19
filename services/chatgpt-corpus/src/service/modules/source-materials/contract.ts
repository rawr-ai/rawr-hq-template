import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { ocBase } from "../../base";
import {
  INVALID_CONVERSATION_EXPORT,
  INVALID_CONVERSATION_JSON,
} from "../../shared/errors";
import { ReadSourceSnapshotOutputSchema } from "./schemas";

const EmptyInputSchema = Type.Object({}, { additionalProperties: false });

export const contract = {
  readSnapshot: ocBase
    .meta({ idempotent: true })
    .input(schema(EmptyInputSchema))
    .output(schema(ReadSourceSnapshotOutputSchema))
    .errors({
      INVALID_CONVERSATION_JSON,
      INVALID_CONVERSATION_EXPORT,
    }),
};
