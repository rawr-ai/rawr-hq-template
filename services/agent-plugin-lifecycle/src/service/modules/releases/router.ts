import { check } from "./router/check";
import { checkRepository } from "./router/check-repository";
import { refreshReleaseInput } from "./router/refresh-release-input";
import { releaseInputRecord } from "./router/release-input-record";

/** Composes the completed release operation leaves for the service root router. */
export const router = {
  check,
  releaseInputRecord,
  refreshReleaseInput,
  checkRepository,
};
