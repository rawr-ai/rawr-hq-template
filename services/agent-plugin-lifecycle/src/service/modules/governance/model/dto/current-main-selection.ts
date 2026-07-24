import { ReadonlyObject, Type } from "typebox";

import {
  CurrentMainSelectionLocatorSchema,
  CurrentMainSelectionResultSchema as SharedCurrentMainSelectionResultSchema,
} from "#agent-plugin-lifecycle-service/model/dto/current-main-selection";

/** Closed locator request accepted by the governance selection operation. */
export const CurrentMainSelectionInputSchema = ReadonlyObject(
  Type.Object({ locator: CurrentMainSelectionLocatorSchema }),
  { additionalProperties: false }
);

/** Shared selection outcome exposed without rebuilding its TypeBox authority. */
export const CurrentMainSelectionResultSchema = SharedCurrentMainSelectionResultSchema;
