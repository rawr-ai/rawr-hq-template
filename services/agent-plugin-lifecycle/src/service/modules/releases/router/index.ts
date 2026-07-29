import { check } from "./check";
import { checkRepository } from "./check-repository";
import { refreshReleaseInput } from "./refresh-release-input";
import { releaseInputRecord } from "./release-input-record";

/** Composes the completed release operation leaves for the service root router. */
export const router = {
  check,
  releaseInputRecord,
  refreshReleaseInput,
  checkRepository,
};
