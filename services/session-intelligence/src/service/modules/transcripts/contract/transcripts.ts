import { procedureMetadata } from "@habitat-ai/sdk/service";
import { standard } from "@habitat-ai/sdk/service/schema";
import { oc } from "@orpc/contract";
import { type Static, Type } from "typebox";
import { RoleFilterSchema, SessionMessageSchema, SessionSourceSchema } from "../../../model/dto";
import { ErrorMessageSchema } from "../../../model/errors";

const ExtractOptionsSchema = Type.Object(
  {
    roles: Type.Array(RoleFilterSchema, {
      description: "Message roles admitted to the normalized transcript.",
    }),
    includeTools: Type.Boolean({
      description: "Whether tool messages are retained in the normalized transcript.",
    }),
    dedupe: Type.Boolean({
      description:
        "Whether messages sharing a role and the first 100 content characters collapse to the first normalized message.",
    }),
    offset: Type.Number({
      description:
        "Positive message offset applied before the result cap; zero or negative starts at the first message.",
    }),
    maxMessages: Type.Number({
      description:
        "Positive result cap applied after the offset; zero or negative leaves the remaining transcript unbounded.",
    }),
  },
  { additionalProperties: false }
);

const ExtractedSessionSchema = Type.Object(
  {
    source: SessionSourceSchema,
    sessionId: Type.Optional(
      Type.String({
        description: "Normalized session identity derived from source metadata or the source name.",
      })
    ),
    file: Type.String({
      description: "Provider-native file from which the transcript was extracted.",
    }),
    cwd: Type.Optional(
      Type.String({ description: "Normalized working directory associated with the session." })
    ),
    gitBranch: Type.Optional(
      Type.String({ description: "Normalized Git branch associated with the session." })
    ),
    model: Type.Optional(
      Type.String({ description: "Normalized model identity associated with the session." })
    ),
    modelProvider: Type.Optional(
      Type.String({
        description: "Normalized model provider derived from source metadata or provider kind.",
      })
    ),
    modelContextWindow: Type.Optional(
      Type.Number({
        description: "Normalized model context-window size when the source supplies it.",
      })
    ),
    sessionMetaCount: Type.Optional(
      Type.Number({ description: "Number of provider session-metadata records encountered." })
    ),
    cwdFirst: Type.Optional(
      Type.String({ description: "First working directory recorded by the session when present." })
    ),
    gitBranchFirst: Type.Optional(
      Type.String({ description: "First Git branch recorded by the session when present." })
    ),
    started: Type.Optional(
      Type.String({ description: "Normalized session timestamp emitted by source parsing." })
    ),
    messageCount: Type.Number({
      description: "Number of normalized messages retained in this transcript.",
    }),
    messages: Type.Array(SessionMessageSchema, {
      description: "Normalized session messages in provider-observed order.",
    }),
  },
  { additionalProperties: false }
);
export type ExtractedSession = Static<typeof ExtractedSessionSchema>;

/** Transcript procedure group exposed through the module contract face. */
export const transcripts = {
  detect: oc
    .meta(procedureMetadata({ idempotent: true, entity: "transcript" }))
    .input(
      standard(
        Type.Object(
          {
            path: Type.String({
              minLength: 1,
              description: "Provider-native session path whose record format should be detected.",
            }),
          },
          { additionalProperties: false }
        )
      )
    )
    .output(
      standard(
        Type.Object(
          {
            source: Type.Union([SessionSourceSchema, Type.Literal("unknown")], {
              description: "Detected provider source, or unknown when no supported format matches.",
            }),
          },
          { additionalProperties: false }
        )
      )
    ),
  extract: oc
    .meta(procedureMetadata({ idempotent: true, entity: "transcript" }))
    .input(
      standard(
        Type.Object(
          {
            path: Type.String({
              minLength: 1,
              description: "Provider-native session path to read and normalize.",
            }),
            options: ExtractOptionsSchema,
          },
          { additionalProperties: false }
        )
      )
    )
    .output(standard(ExtractedSessionSchema))
    .errors({
      UNKNOWN_SESSION_FORMAT: {
        message: "Unknown session format",
        data: standard(ErrorMessageSchema),
      },
    }),
};
