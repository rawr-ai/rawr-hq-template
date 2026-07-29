import { check } from "./check";
import { checkRepository } from "./check-repository";
import { refreshReleaseInput } from "./refresh-release-input";
import { releaseInputRecord } from "./release-input-record";

/** Releases contract composed from its four operation leaves. */
export const contract = {
  check,
  releaseInputRecord,
  refreshReleaseInput,
  checkRepository,
};
