import { procedureMetadata } from "@habitat-ai/rawr-hq-sdk";
import { standard } from "@habitat-ai/typebox-adapter";
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { SourceSnapshotSchema } from "../../../model/entities";
import { INVALID_CONVERSATION_EXPORT, INVALID_CONVERSATION_JSON } from "../../../model/errors";

const EmptyInputSchema = Type.Object({}, { additionalProperties: false });
const ReadSourceSnapshotOutputSchema = Type.Object(
  {
    workspaceRef: Type.String({
      minLength: 1,
      description: "Workspace identity from which the normalized source snapshot was read.",
    }),
    sourceCounts: Type.Object(
      {
        jsonConversations: Type.Number({
          minimum: 0,
          description: "Number of admitted ChatGPT conversation exports in the snapshot.",
        }),
        markdownDocuments: Type.Number({
          minimum: 0,
          description: "Number of admitted supporting Markdown documents in the snapshot.",
        }),
        totalSources: Type.Number({
          minimum: 0,
          description: "Total number of admitted source documents in the snapshot.",
        }),
      },
      {
        additionalProperties: false,
        description: "Counts summarizing the complete admitted source snapshot.",
      }
    ),
    snapshot: SourceSnapshotSchema,
  },
  { additionalProperties: false }
);

export const sourceMaterials = {
  readSnapshot: oc
    .meta(procedureMetadata({ idempotent: true }))
    .input(standard(EmptyInputSchema))
    .output(standard(ReadSourceSnapshotOutputSchema))
    .errors({
      INVALID_CONVERSATION_JSON,
      INVALID_CONVERSATION_EXPORT,
    }),
};
