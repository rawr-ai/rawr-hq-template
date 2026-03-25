import { createRawrHqManifest } from "@rawr/hq-app/manifest";
import { createRawrHostBoundRolePlan } from "./host-seam";
import { materializeRawrHostBoundRolePlan } from "./host-realization";

const noopLogger = {
  info() {},
  error() {},
} as const;

export function createTestingRawrHostSeam() {
  const manifest = createRawrHqManifest({
    hostLogger: noopLogger,
  });
  const boundRolePlan = createRawrHostBoundRolePlan({ manifest });
  const realization = materializeRawrHostBoundRolePlan(boundRolePlan);

  return {
    manifest,
    boundRolePlan,
    realization,
  } as const;
}
