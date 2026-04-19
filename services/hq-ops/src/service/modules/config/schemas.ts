import { type Static, Type } from "typebox";
import { RawrConfigV1Schema } from "./model";

export const ConfigLoadErrorSchema = Type.Object(
  {
    message: Type.String({ minLength: 1 }),
    cause: Type.Optional(Type.String({ minLength: 1 })),
    issues: Type.Optional(
      Type.Array(
        Type.Object(
          {
            path: Type.String({ minLength: 1 }),
            message: Type.String({ minLength: 1 }),
          },
          { additionalProperties: false },
        ),
      ),
    ),
  },
  { additionalProperties: false },
);

export const ConfigLoadResultSchema = Type.Object(
  {
    config: Type.Union([RawrConfigV1Schema, Type.Null()]),
    path: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
    warnings: Type.Array(Type.String()),
    error: Type.Optional(ConfigLoadErrorSchema),
  },
  { additionalProperties: false },
);

export const ConfigLayeredResultSchema = Type.Object(
  {
    global: ConfigLoadResultSchema,
    workspace: ConfigLoadResultSchema,
    merged: Type.Union([RawrConfigV1Schema, Type.Null()]),
  },
  { additionalProperties: false },
);

export const SyncSourcesSchema = Type.Object(
  {
    path: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
    sources: Type.Array(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

export type ConfigLoadResult = Static<typeof ConfigLoadResultSchema>;
export type ConfigLayeredResult = Static<typeof ConfigLayeredResultSchema>;
export type SyncSourcesResult = Static<typeof SyncSourcesSchema>;
