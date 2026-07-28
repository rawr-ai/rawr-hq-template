import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";
import { standard } from "@rawr/typebox-adapter";

import {
  CurrentMainRecordInputSchema,
  CurrentMainRecordResultSchema,
} from "./model/dto/current-main-record";
import {
  CurrentMainSelectionInputSchema,
  CurrentMainSelectionResultSchema,
} from "./model/dto/current-main-selection";

export const contract = {
  currentMainRecord: oc
    .meta(
      procedureMetadata({
        idempotent: true,
        audit: "full",
        entity: "governance",
      })
    )
    .input(standard(CurrentMainRecordInputSchema))
    .output(standard(CurrentMainRecordResultSchema)),
  currentMainSelection: oc
    .meta(
      procedureMetadata({
        idempotent: true,
        audit: "full",
        entity: "governance",
      })
    )
    .input(standard(CurrentMainSelectionInputSchema))
    .output(standard(CurrentMainSelectionResultSchema)),
};
