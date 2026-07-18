import { build } from "./build.router";
import { check } from "./check.router";
import { checkRepository } from "./check-repository.router";
import { planRetention } from "./plan-retention.router";

export const router = {
  check,
  checkRepository,
  build,
  planRetention,
};
