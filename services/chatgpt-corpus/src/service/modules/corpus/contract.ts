import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { ocBase } from "../../base";
import {
  INVALID_CONVERSATION_EXPORT,
  INVALID_CONVERSATION_JSON,
} from "../../shared/errors";

const InitWorkspaceInputSchema = Type.Object(
  {
    workspaceRoot: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

const InitWorkspaceOutputSchema = Type.Object(
  {
    workspaceRoot: Type.String({ minLength: 1 }),
    createdPaths: Type.Array(Type.String({ minLength: 1 })),
    existingPaths: Type.Array(Type.String({ minLength: 1 })),
    files: Type.Object(
      {
        readmePath: Type.String({ minLength: 1 }),
        gitignorePath: Type.String({ minLength: 1 }),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

const ConsolidateWorkspaceInputSchema = Type.Object(
  {
    workspaceRoot: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

const ConsolidateWorkspaceOutputSchema = Type.Object(
  {
    workspaceRoot: Type.String({ minLength: 1 }),
    sourceCounts: Type.Object(
      {
        jsonConversations: Type.Number({ minimum: 0 }),
        markdownDocuments: Type.Number({ minimum: 0 }),
        totalSources: Type.Number({ minimum: 0 }),
      },
      { additionalProperties: false },
    ),
    familyCount: Type.Number({ minimum: 0 }),
    normalizedThreadCount: Type.Number({ minimum: 0 }),
    anomalyCount: Type.Number({ minimum: 0 }),
    warnings: Type.Array(Type.String()),
    outputPaths: Type.Object(
      {
        inventory: Type.String({ minLength: 1 }),
        familyGraphs: Type.String({ minLength: 1 }),
        intermediateGraph: Type.String({ minLength: 1 }),
        manifest: Type.String({ minLength: 1 }),
        reportsDir: Type.String({ minLength: 1 }),
        normalizedThreadsDir: Type.String({ minLength: 1 }),
        validationReport: Type.String({ minLength: 1 }),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

export const contract = {
  initWorkspace: ocBase
    .meta({ idempotent: false })
    .input(schema(InitWorkspaceInputSchema))
    .output(schema(InitWorkspaceOutputSchema)),
  consolidateWorkspace: ocBase
    .meta({ idempotent: false })
    .input(schema(ConsolidateWorkspaceInputSchema))
    .output(schema(ConsolidateWorkspaceOutputSchema))
    .errors({
      INVALID_CONVERSATION_JSON,
      INVALID_CONVERSATION_EXPORT,
    }),
};
