import { type Static, Type } from "typebox";

const clampInt = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.trunc(value)));

export function clampJournalCandidateLimit(value: number | undefined): number {
  return clampInt(value ?? 200, 1, 500);
}

export const RawrConfigV1Schema = Type.Object(
  {
    version: Type.Literal(1),
    journal: Type.Optional(
      Type.Object(
        {
          semantic: Type.Optional(
            Type.Object(
              {
                candidateLimit: Type.Optional(Type.Integer()),
                model: Type.Optional(Type.String()),
              },
              { additionalProperties: false }
            )
          ),
        },
        { additionalProperties: false }
      )
    ),
    server: Type.Optional(
      Type.Object(
        {
          port: Type.Optional(Type.Integer()),
          baseUrl: Type.Optional(Type.String()),
        },
        { additionalProperties: false }
      )
    ),
  },
  { additionalProperties: false }
);

export type RawrConfigV1 = Static<typeof RawrConfigV1Schema>;
export type RawrConfig = RawrConfigV1;

export const ConfigValidationIssueSchema = Type.Object(
  {
    path: Type.String({ minLength: 1 }),
    message: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false }
);

export type ConfigValidationIssue = Static<typeof ConfigValidationIssueSchema>;

export const ConfigLoadErrorSchema = Type.Object(
  {
    message: Type.String({ minLength: 1 }),
    cause: Type.Optional(Type.String({ minLength: 1 })),
    issues: Type.Optional(Type.Array(ConfigValidationIssueSchema)),
  },
  { additionalProperties: false }
);

export const ConfigLoadResultSchema = Type.Object(
  {
    config: Type.Union([RawrConfigV1Schema, Type.Null()]),
    path: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
    warnings: Type.Array(Type.String()),
    error: Type.Optional(ConfigLoadErrorSchema),
  },
  { additionalProperties: false }
);

export type LoadRawrConfigResult = Static<typeof ConfigLoadResultSchema>;

export const ConfigLayeredResultSchema = Type.Object(
  {
    global: ConfigLoadResultSchema,
    workspace: ConfigLoadResultSchema,
    merged: Type.Union([RawrConfigV1Schema, Type.Null()]),
  },
  { additionalProperties: false }
);

export type LoadRawrConfigLayeredResult = Static<typeof ConfigLayeredResultSchema>;
