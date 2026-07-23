import {
  encodeCurrentMainBodyV3,
  validateCurrentMainRecordV3,
} from "../model/policy/current-main-record";
import { module } from "../module";

export const currentMainRecord = module.currentMainRecord.handler(async ({ input }) =>
  input.kind === "encode-body"
    ? encodeCurrentMainBodyV3(input.body)
    : validateCurrentMainRecordV3(input.bytes)
);
