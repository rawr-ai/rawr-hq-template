import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { ocBase } from "../../base";
import {
  ConfigLayeredResultSchema,
  ConfigLoadResultSchema,
  ConfigValidationIssueSchema,
  SyncSourcesResultSchema,
} from "./entities";

const InvalidGlobalConfigDataSchema = schema(
  Type.Object(
    {
      issues: Type.Array(ConfigValidationIssueSchema),
    },
    {
      additionalProperties: false,
      description: "Validation issues from ~/.rawr/config.json.",
    },
  ),
);

const INVALID_GLOBAL_CONFIG = {
  status: 400,
  message: "Invalid global RAWR config",
  data: InvalidGlobalConfigDataSchema,
} as const;

export type { ConfigValidationIssue, LoadRawrConfigLayeredResult, LoadRawrConfigResult } from "./entities";

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
    .output(schema(SyncSourcesResultSchema))
    .errors({ INVALID_GLOBAL_CONFIG }),
  removeGlobalSyncSource: ocBase
    .meta({ idempotent: false, entity: "config" })
    .input(SyncSourceMutationInputSchema)
    .output(schema(SyncSourcesResultSchema))
    .errors({ INVALID_GLOBAL_CONFIG }),
};
