import { ReadonlyObject, type Static, Type } from "typebox";

import {
  CurrentMainSelectionLocatorSchema,
  CurrentMainSelectionResultSchema,
} from "../../model/dto/current-main-selection";

import {
  CurrentMainBodyV3Schema,
  CurrentMainBytesSchema,
  CurrentMainV3CodecResultSchema,
} from "./model/dto/current-main";

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

export type { GitLocatorInput } from "./model/dto/boundary";
export { CurrentMainSelectionResultSchema };
