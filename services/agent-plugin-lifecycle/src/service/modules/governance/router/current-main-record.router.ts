import {
  encodeCurrentMainBodyV3,
  validateCurrentMainRecordV3,
} from "#agent-plugin-lifecycle-service/model/policy/current-main-record";
import { module } from "../module";

export const currentMainRecord = module.currentMainRecord.effect(function* ({ input }) {
  return input.kind === "encode-body"
    ? encodeCurrentMainBodyV3(input.body)
    : validateCurrentMainRecordV3(input.bytes);
});
