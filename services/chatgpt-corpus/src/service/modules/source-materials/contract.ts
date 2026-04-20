import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { ocBase } from "../../base";
import {
  INVALID_CONVERSATION_EXPORT,
  INVALID_CONVERSATION_JSON,
} from "../../shared/errors";
import { SourceSnapshotSchema } from "./entities";

const EmptyInputSchema = Type.Object({}, { additionalProperties: false });
const ReadSourceSnapshotOutputSchema = Type.Object(
  {
    workspaceRef: Type.String({ minLength: 1 }),
    sourceCounts: Type.Object(
      {
        jsonConversations: Type.Number({ minimum: 0 }),
        markdownDocuments: Type.Number({ minimum: 0 }),
        totalSources: Type.Number({ minimum: 0 }),
      },
      { additionalProperties: false },
    ),
    snapshot: SourceSnapshotSchema,
  },
  { additionalProperties: false },
);

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
