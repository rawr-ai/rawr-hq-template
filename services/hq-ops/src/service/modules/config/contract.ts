import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { ocBase } from "../../base";
import {
  ConfigLayeredResultSchema,
  ConfigLoadResultSchema,
} from "./entities";

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
};
