import { standard } from "@habitat-ai/typebox-adapter";
import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";
import {
  CurrentMainSelectionInputSchema,
  CurrentMainSelectionResultSchema,
} from "../model/dto/current-main-selection";

/** Contract procedure for resolving reviewed current-main input against exact Git content. */
export const currentMainSelection = oc
  .meta(
    procedureMetadata({
      idempotent: true,
      audit: "full",
      entity: "governance",
    })
  )
  .input(standard(CurrentMainSelectionInputSchema))
  .output(standard(CurrentMainSelectionResultSchema));
