import { procedureMetadata } from "@habitat-ai/sdk/service";
import { standard } from "@habitat-ai/sdk/service/schema";
import { oc } from "@orpc/contract";
import { type Static, Type } from "typebox";
import {
  SessionListItemSchema,
  SessionMetadataSchema,
  SessionSourceFilterSchema,
  SessionSourceSchema,
  SessionStatusSchema,
} from "../../../model/dto";
import { ErrorMessageSchema } from "../../../model/errors";

const SessionFiltersSchema = Type.Object(
  {
    project: Type.Optional(
      Type.String({ description: "Project identity that catalog entries must match." })
    ),
    cwdContains: Type.Optional(
      Type.String({ description: "Path fragment required in a session working directory." })
    ),
    branch: Type.Optional(
      Type.String({ description: "Git branch identity that catalog entries must match." })
    ),
    model: Type.Optional(
      Type.String({ description: "Model identity that catalog entries must match." })
    ),
    since: Type.Optional(
      Type.String({
        description: "Earliest session modification boundary admitted by the catalog.",
      })
    ),
    until: Type.Optional(
      Type.String({ description: "Latest session modification boundary admitted by the catalog." })
    ),
  },
  { additionalProperties: false }
);
export type SessionFilters = Static<typeof SessionFiltersSchema>;

const ResolveResultSchema = Type.Object(
  {
    resolved: Type.Object(
      {
        path: Type.String({
          description: "Resolved provider-native path to the session source.",
        }),
        source: SessionSourceSchema,
        status: Type.Optional(SessionStatusSchema),
        modified: Type.String({
          description: "Provider-observed modification time for the session.",
        }),
        sizeBytes: Type.Number({
          description: "Provider-observed byte size of the session record.",
        }),
      },
      {
        additionalProperties: false,
        description: "Stable source location and observations for the resolved session.",
      }
    ),
    metadata: SessionMetadataSchema,
  },
  { additionalProperties: false }
);
export type ResolveResult = Static<typeof ResolveResultSchema>;

/** Catalog procedure group exposed through the module contract face. */
export const catalog = {
  list: oc
    .meta(procedureMetadata({ idempotent: true, entity: "catalog" }))
    .input(
      standard(
        Type.Object(
          {
            source: SessionSourceFilterSchema,
            limit: Type.Number({
              description:
                "Positive result cap; zero or negative returns every admitted catalog entry.",
            }),
            filters: Type.Optional(SessionFiltersSchema),
          },
          { additionalProperties: false }
        )
      )
    )
    .output(
      standard(
        Type.Object(
          {
            sessions: Type.Array(SessionListItemSchema, {
              description: "Bounded catalog entries ordered for caller discovery.",
            }),
          },
          { additionalProperties: false }
        )
      )
    ),
  resolve: oc
    .meta(procedureMetadata({ idempotent: true, entity: "catalog" }))
    .input(
      standard(
        Type.Object(
          {
            session: Type.String({
              minLength: 1,
              description: "Caller-supplied path or provider identity of the session to resolve.",
            }),
            source: SessionSourceFilterSchema,
          },
          { additionalProperties: false }
        )
      )
    )
    .output(standard(ResolveResultSchema))
    .errors({
      SESSION_NOT_FOUND: {
        message: "Session not found",
        data: standard(ErrorMessageSchema),
      },
      UNKNOWN_SESSION_FORMAT: {
        message: "Unknown session format",
        data: standard(ErrorMessageSchema),
      },
    }),
};
