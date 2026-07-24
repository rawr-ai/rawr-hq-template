import { ReadonlyObject, type Static, Type } from "typebox";
import {
  type CurrentMainBodyV3,
  CurrentMainBodyV3Schema,
  CurrentMainBytesSchema,
  CurrentMainV3CodecResultSchema,
} from "#agent-plugin-lifecycle-service/model/dto/current-main";
import type { GitLocatorInput } from "#agent-plugin-lifecycle-service/model/policy/current-main-locator";
import {
  CurrentMainSelectionLocatorSchema,
  CurrentMainSelectionResultSchema,
} from "../../model/dto/current-main-selection";

export const GitLocatorSchema = CurrentMainSelectionLocatorSchema;

export const CurrentMainSelectionInputSchema = ReadonlyObject(
  Type.Object({ locator: GitLocatorSchema }),
  { additionalProperties: false }
);

export const CurrentMainRecordInputSchema = Type.Union([
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("encode-body"),
      body: CurrentMainBodyV3Schema,
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("validate-record"),
      bytes: CurrentMainBytesSchema,
    }),
    { additionalProperties: false }
  ),
]);

export const CurrentMainRecordResultSchema = CurrentMainV3CodecResultSchema;
export type CurrentMainRecordProcedureResult = Static<typeof CurrentMainRecordResultSchema>;

export type { CurrentMainBodyV3, GitLocatorInput };
export { CurrentMainSelectionResultSchema };
