import { schema } from "@rawr/hq-sdk";
import { ocBase } from "../../base";
import {
  CurrentMainRecordInputSchema,
  CurrentMainRecordResultSchema,
  CurrentMainSelectionInputSchema,
  CurrentMainSelectionResultSchema,
} from "./schemas";

export const contract = {
  currentMainRecord: ocBase
    .meta({ idempotent: true, entity: "governance", audit: "full" })
    .input(schema(CurrentMainRecordInputSchema))
    .output(schema(CurrentMainRecordResultSchema)),
  currentMainSelection: ocBase
    .meta({ idempotent: true, entity: "governance", audit: "full" })
    .input(schema(CurrentMainSelectionInputSchema))
    .output(schema(CurrentMainSelectionResultSchema)),
};
