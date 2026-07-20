import { build } from "./build.router";
import { check } from "./check.router";
import { checkRepository } from "./check-repository.router";
import { planRetention } from "./plan-retention.router";
import { refreshReleaseInput } from "./refresh-release-input.router";
import { releaseInputRecord } from "./release-input-record.router";

export const router = {
  check,
  releaseInputRecord,
  refreshReleaseInput,
  checkRepository,
  build,
  planRetention,
};
