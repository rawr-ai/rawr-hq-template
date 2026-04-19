import { createRawrHqManifest, type RawrHqManifest } from "@rawr/hq-app/manifest";
import { materializeRawrHostBoundRolePlan } from "./host-realization";
import {
  createRawrHostBoundRolePlan,
  type RawrHostBoundRolePlan,
  type RawrHostDeclarations,
} from "./host-seam";
import {
  createRawrHostSatisfiers,
  type HostServiceLogger,
  type RawrHostSatisfiers,
} from "./host-satisfiers";

export type RawrHostComposition = Readonly<{
  manifest: RawrHqManifest;
  declarations: RawrHostDeclarations;
  satisfiers: RawrHostSatisfiers;
  boundRolePlan: RawrHostBoundRolePlan;
  realization: ReturnType<typeof materializeRawrHostBoundRolePlan>;
}>;

function selectRawrHostDeclarations(manifest: RawrHqManifest): RawrHostDeclarations {
  return {
    api: manifest.plugins.api,
    workflows: manifest.plugins.workflows,
  } as const;
}

/**
 * @agents-style seam-law declaration -> host binding -> request/process materialization
 * @agents-style canonical server-owned executable composition entrypoint
 * @agents-canonical temporary bridge localization point
 * @agents-must-not distributed runtime/testing/OpenAPI bridge consumption
 *
 * Owns:
 * - the only sanctioned server-side intake of HQ app declaration authority
 *   while split-project topology still exists
 * - host satisfier construction, bound role-plan creation, and realized host
 *   surface materialization as one executable composition story
 *
 * Must not own:
 * - declaration selection semantics beyond consuming the HQ app manifest
 * - request-scoped context creation
 * - route mounting
 * - OpenAPI or proof-specific alternate assembly paths
 */
export function createRawrHostComposition(input: {
  hostLogger: HostServiceLogger;
}): RawrHostComposition {
  const manifest = createRawrHqManifest();
  const declarations = selectRawrHostDeclarations(manifest);
  const satisfiers = createRawrHostSatisfiers({
    hostLogger: input.hostLogger,
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
