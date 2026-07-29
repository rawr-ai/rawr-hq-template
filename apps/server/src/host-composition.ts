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
  declarations: RawrHostDeclarations;
  satisfiers: RawrHostSatisfiers;
  rolePlan: RawrHostRolePlan;
  realization: ReturnType<typeof materializeRawrHostRolePlan>;
}>;

/**
 * @agents-style seam-law declaration -> host binding -> request/process materialization
 * @agents-style canonical server-owned executable composition entrypoint
 * @agents-canonical temporary bridge localization point
 * @agents-must-not distributed runtime/testing/OpenAPI bridge consumption
 *
 * Owns:
 * - server-side binding of app-selected declarations
 * - host satisfier construction, role-plan creation, and realized host
 *   surface materialization as one executable composition story
 *
 * Must not own:
 * - declaration or process-role selection
 * - request-scoped context creation
 * - route mounting
 * - OpenAPI or proof-specific alternate assembly paths
 */
export function createRawrHostComposition(input: {
  declarations: RawrHostDeclarations;
  hostLogger: HostServiceLogger;
}): RawrHostComposition {
  const declarations = input.declarations;
  const satisfiers = createRawrHostSatisfiers({
    hostLogger: input.hostLogger,
  });
  const rolePlan = createRawrHostRolePlan({
    declarations,
  });
  const realization = materializeRawrHostRolePlan(rolePlan);

  return {
    declarations,
    satisfiers,
    rolePlan,
    realization,
  } as const;
}
