import { ReadonlyObject, Type, type Static } from "typebox";

import {
  CurrentMainSelectionLocatorSchema,
  CurrentMainSelectionResultSchema,
} from "../../model/dto/current-main-selection";

import {
  CurrentMainBytesSchema,
  CurrentMainBodyV2Schema,
  CurrentMainV2CodecResultSchema,
} from "./model/dto/current-main";

export const GitLocatorSchema = CurrentMainSelectionLocatorSchema;

export const CurrentMainSelectionInputSchema = ReadonlyObject(Type.Object(
  { locator: GitLocatorSchema },
), { additionalProperties: false });

export const CurrentMainRecordInputSchema = Type.Union([
  ReadonlyObject(Type.Object(
    {
      kind: Type.Literal("encode-body"),
      body: CurrentMainBodyV2Schema,
    },
  ), { additionalProperties: false }),
  ReadonlyObject(Type.Object(
    {
      kind: Type.Literal("validate-envelope"),
      bytes: CurrentMainBytesSchema,
    },
  ), { additionalProperties: false }),
]);

export const CurrentMainRecordResultSchema = CurrentMainV2CodecResultSchema;
export type CurrentMainRecordProcedureResult = Static<typeof CurrentMainRecordResultSchema>;

export { CurrentMainSelectionResultSchema };
export type { GitLocatorInput } from "./model/dto/boundary";
