import { evaluateReleaseInputRecord } from "../model/policy/release-input-record";
import { module } from "../module";

/** Encodes or validates the canonical release-input record without acquiring resources. */
export const releaseInputRecord = module.releaseInputRecord.effect(function* ({ input }) {
  return evaluateReleaseInputRecord(input);
});
