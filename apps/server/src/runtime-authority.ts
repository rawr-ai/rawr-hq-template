import { createRawrHqManifest, type RawrHqManifest } from "@rawr/hq-app/manifest";
import { materializeRawrHostBoundRolePlan } from "./host-realization";
import {
  createRawrHostBoundRolePlan,
  type RawrHostBoundRolePlan,
  type RawrHostDeclarations,
} from "./host-seam";
import { createHostLoggerAdapter } from "./logging";
import {
  createRawrHostSatisfiers,
  type HostServiceLogger,
  type RawrHostSatisfiers,
} from "./host-satisfiers";

const testingHostLogger = {
  info() {},
  error() {},
} as const;

export type RawrHqRuntimeAuthority = Readonly<{
  manifest: RawrHqManifest;
  declarations: RawrHostDeclarations;
  satisfiers: RawrHostSatisfiers;
  boundRolePlan: RawrHostBoundRolePlan;
  realization: ReturnType<typeof materializeRawrHostBoundRolePlan>;
}>;

function selectRawrHostDeclarations(manifest: RawrHqManifest): RawrHostDeclarations {
  return {
    api: manifest.roles.server.api,
    workflows: manifest.roles.async.workflows,
  } as const;
}

export function createRawrHqRuntimeAuthority(input: {
  hostLogger?: HostServiceLogger;
} = {}): RawrHqRuntimeAuthority {
  const manifest = createRawrHqManifest();
  const declarations = selectRawrHostDeclarations(manifest);
  const satisfiers = createRawrHostSatisfiers({
    hostLogger: input.hostLogger ?? createHostLoggerAdapter(),
  });
  const boundRolePlan = createRawrHostBoundRolePlan({
    declarations,
    satisfiers,
  });
  const realization = materializeRawrHostBoundRolePlan(boundRolePlan);

  return {
    manifest,
    declarations,
    satisfiers,
    boundRolePlan,
    realization,
  } as const;
}

export function createTestingRawrHqRuntimeAuthority() {
  return createRawrHqRuntimeAuthority({
    hostLogger: testingHostLogger,
  });
}
