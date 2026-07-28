import { createRawrHqManifest, type RawrHqManifest } from "@rawr/hq-app/manifest";
import { materializeRawrHostRolePlan } from "./host-realization";
import {
  createRawrHostSatisfiers,
  type HostServiceLogger,
  type RawrHostSatisfiers,
} from "./host-satisfiers";
import {
  createRawrHostRolePlan,
  type RawrHostDeclarations,
  type RawrHostRolePlan,
} from "./host-seam";

export type RawrHostComposition = Readonly<{
  manifest: RawrHqManifest;
  declarations: RawrHostDeclarations;
  satisfiers: RawrHostSatisfiers;
  rolePlan: RawrHostRolePlan;
  realization: ReturnType<typeof materializeRawrHostRolePlan>;
}>;

function selectRawrHostDeclarations(manifest: RawrHqManifest): RawrHostDeclarations {
  return {
    api: manifest.roles.server.api,
    workflows: manifest.roles.async.workflows,
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
 * - host satisfier construction, role-plan creation, and realized host
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
  const rolePlan = createRawrHostRolePlan({
    declarations,
  });
  const realization = materializeRawrHostRolePlan(rolePlan);

  return {
    manifest,
    declarations,
    satisfiers,
    rolePlan,
    realization,
  } as const;
}
