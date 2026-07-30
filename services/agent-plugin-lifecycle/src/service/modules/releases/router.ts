import { check } from "./router/check.router";
import { checkRepository } from "./router/check-repository.router";
import { refreshReleaseInput } from "./router/refresh-release-input.router";
import { releaseInputRecord } from "./router/release-input-record.router";

/** Composes the completed release operation leaves for the service root router. */
export const router = {
  check,
  releaseInputRecord,
  refreshReleaseInput,
  checkRepository,
};
