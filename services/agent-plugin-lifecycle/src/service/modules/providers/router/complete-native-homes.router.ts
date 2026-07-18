import { createCompleteNativeHomesObservation, type CompleteNativeHomesObservation } from "../model/dto/native-homes";
import type { DeploymentResult } from "../model/errors/deployment-result";
import { module } from "../module";
import type { CompleteTargetIdentityReader } from "../ports/state";
import { completeNativeHomesResult } from "./procedure-result";

export interface CompleteNativeHomesDependencies {
  readonly identities: CompleteTargetIdentityReader;
}

export const completeNativeHomes = module.completeNativeHomes.handler(
  async ({ context }) => completeNativeHomesResult(
    readCompleteNativeHomes(context.providers),
  ),
);

async function readCompleteNativeHomes(
  ports: CompleteNativeHomesDependencies,
): Promise<DeploymentResult<CompleteNativeHomesObservation>> {
    const sidecars = await ports.identities.readAll();
    return sidecars.ok ? createCompleteNativeHomesObservation(sidecars.value) : sidecars;
}
