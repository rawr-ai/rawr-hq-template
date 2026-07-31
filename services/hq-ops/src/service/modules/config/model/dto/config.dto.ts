import { type Static, Type } from "typebox";

/** Empty request body shared by configuration read operations. */
export const EmptyConfigInputSchema = Type.Object(
  {},
  {
    additionalProperties: false,
    description: "No caller input is required.",
  }
);

/** Supported repository-neutral HQ configuration document. */
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

/** Supported v1 configuration document. */
export type RawrConfigV1 = Static<typeof RawrConfigV1Schema>;

/** Current admitted HQ configuration document. */
export type RawrConfig = RawrConfigV1;

/** One caller-readable configuration validation failure. */
export const ConfigValidationIssueSchema = Type.Object(
  {
    path: Type.String({ minLength: 1 }),
    message: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false }
);

/** One caller-readable configuration validation failure. */
export type ConfigValidationIssue = Static<typeof ConfigValidationIssueSchema>;

/** Structured failure returned when a configuration source cannot be admitted. */
export const ConfigLoadErrorSchema = Type.Object(
  {
    message: Type.String({ minLength: 1 }),
    cause: Type.Optional(Type.String({ minLength: 1 })),
    issues: Type.Optional(Type.Array(ConfigValidationIssueSchema)),
  },
  { additionalProperties: false }
);

/** Result of loading one configuration layer. */
export const ConfigLoadResultSchema = Type.Object(
  {
    config: Type.Union([RawrConfigV1Schema, Type.Null()]),
    path: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
    warnings: Type.Array(Type.String()),
    error: Type.Optional(ConfigLoadErrorSchema),
  },
  { additionalProperties: false }
);

/** Result of loading one configuration layer. */
export type LoadRawrConfigResult = Static<typeof ConfigLoadResultSchema>;

/** Global and workspace configuration layers plus their admitted merge. */
export const ConfigLayeredResultSchema = Type.Object(
  {
    global: ConfigLoadResultSchema,
    workspace: ConfigLoadResultSchema,
    merged: Type.Union([RawrConfigV1Schema, Type.Null()]),
  },
  { additionalProperties: false }
);

/** Global and workspace configuration layers plus their admitted merge. */
export type LoadRawrConfigLayeredResult = Static<typeof ConfigLayeredResultSchema>;
