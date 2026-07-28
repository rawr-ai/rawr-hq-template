import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";
import { standard } from "@rawr/typebox-adapter";
import { Type } from "typebox";
import { ConfigLayeredResultSchema, ConfigLoadResultSchema } from "./entities";

export type {
  ConfigValidationIssue,
  LoadRawrConfigLayeredResult,
  LoadRawrConfigResult,
} from "./entities";

const EmptyInputSchema = standard(
  Type.Object(
    {},
    {
      additionalProperties: false,
      description: "No caller input is required.",
    }
  )
);

export const contract = {
  getWorkspaceConfig: oc
    .meta(procedureMetadata({ idempotent: true, entity: "config" }))
    .input(EmptyInputSchema)
    .output(standard(ConfigLoadResultSchema)),
  getGlobalConfig: oc
    .meta(procedureMetadata({ idempotent: true, entity: "config" }))
    .input(EmptyInputSchema)
    .output(standard(ConfigLoadResultSchema)),
  getLayeredConfig: oc
    .meta(procedureMetadata({ idempotent: true, entity: "config" }))
    .input(EmptyInputSchema)
    .output(standard(ConfigLayeredResultSchema)),
};
