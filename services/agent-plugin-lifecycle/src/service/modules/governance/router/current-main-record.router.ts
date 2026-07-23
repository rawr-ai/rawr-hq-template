import {
  encodeCurrentMainBodyV2,
  validateCurrentMainEnvelopeV2,
} from "../model/policy/current-main-record";
import { module } from "../module";

export const currentMainRecord = module.currentMainRecord.handler(async ({ input }) =>
  input.kind === "encode-body"
    ? encodeCurrentMainBodyV2(input.body)
    : validateCurrentMainEnvelopeV2(input.bytes)
);
