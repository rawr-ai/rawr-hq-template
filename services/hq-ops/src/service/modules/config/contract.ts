import { schema } from "@rawr/hq-sdk";
import { type Static, Type } from "typebox";
import { ocBase } from "../../base";
import { RawrConfigV1Schema } from "./entities";

const ConfigValidationIssueSchema = Type.Object(
  {
    path: Type.String({ minLength: 1 }),
    message: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

const ConfigLoadErrorSchema = Type.Object(
  {
    message: Type.String({ minLength: 1 }),
    cause: Type.Optional(Type.String({ minLength: 1 })),
    issues: Type.Optional(Type.Array(ConfigValidationIssueSchema)),
  },
  { additionalProperties: false },
);

const ConfigLoadResultSchema = Type.Object(
  {
    config: Type.Union([RawrConfigV1Schema, Type.Null()]),
    path: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
    warnings: Type.Array(Type.String()),
    error: Type.Optional(ConfigLoadErrorSchema),
  },
  { additionalProperties: false },
);

const ConfigLayeredResultSchema = Type.Object(
  {
    global: ConfigLoadResultSchema,
    workspace: ConfigLoadResultSchema,
    merged: Type.Union([RawrConfigV1Schema, Type.Null()]),
  },
  { additionalProperties: false },
);

const SyncSourcesResultSchema = Type.Object(
  {
    path: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
    sources: Type.Array(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

export type ConfigValidationIssue = Static<typeof ConfigValidationIssueSchema>;
export type LoadRawrConfigResult = Static<typeof ConfigLoadResultSchema>;
export type LoadRawrConfigLayeredResult = Static<typeof ConfigLayeredResultSchema>;

const EmptyInputSchema = schema(
  Type.Object(
    {},
    {
      additionalProperties: false,
      description: "No caller input is required.",
    },
  ),
);

const SyncSourceMutationInputSchema = schema(
  Type.Object(
    {
      path: Type.String({ minLength: 1 }),
    },
    {
      additionalProperties: false,
      description: "Absolute or already-resolved sync source path.",
    },
  ),
);

export const contract = {
  getWorkspaceConfig: ocBase
    .meta({ idempotent: true, entity: "config" })
    .input(EmptyInputSchema)
    .output(schema(ConfigLoadResultSchema)),
  getGlobalConfig: ocBase
    .meta({ idempotent: true, entity: "config" })
    .input(EmptyInputSchema)
    .output(schema(ConfigLoadResultSchema)),
  getLayeredConfig: ocBase
    .meta({ idempotent: true, entity: "config" })
    .input(EmptyInputSchema)
    .output(schema(ConfigLayeredResultSchema)),
  listGlobalSyncSources: ocBase
    .meta({ idempotent: true, entity: "config" })
    .input(EmptyInputSchema)
    .output(schema(SyncSourcesResultSchema)),
  addGlobalSyncSource: ocBase
    .meta({ idempotent: false, entity: "config" })
    .input(SyncSourceMutationInputSchema)
    .output(schema(SyncSourcesResultSchema)),
  removeGlobalSyncSource: ocBase
    .meta({ idempotent: false, entity: "config" })
    .input(SyncSourceMutationInputSchema)
    .output(schema(SyncSourcesResultSchema)),
};
