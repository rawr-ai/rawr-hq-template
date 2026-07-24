import { type ServiceMetadataOf, schema } from "@rawr/hq-sdk";
import { eoc } from "effect-orpc";

import {
  CurrentMainRecordInputSchema,
  CurrentMainRecordResultSchema,
  CurrentMainSelectionInputSchema,
  CurrentMainSelectionResultSchema,
} from "./schemas";

export const contract = {
  currentMainRecord: eoc
    .$meta<ServiceMetadataOf<{ audit: "full"; entity: "governance" }>>({
      idempotent: true,
      domain: "agent-plugin-lifecycle",
      audience: "internal",
      audit: "full",
      entity: "governance",
    })
    .input(schema(CurrentMainRecordInputSchema))
    .output(schema(CurrentMainRecordResultSchema)),
  currentMainSelection: eoc
    .$meta<ServiceMetadataOf<{ audit: "full"; entity: "governance" }>>({
      idempotent: true,
      domain: "agent-plugin-lifecycle",
      audience: "internal",
      audit: "full",
      entity: "governance",
    })
    .input(schema(CurrentMainSelectionInputSchema))
    .output(schema(CurrentMainSelectionResultSchema)),
};
