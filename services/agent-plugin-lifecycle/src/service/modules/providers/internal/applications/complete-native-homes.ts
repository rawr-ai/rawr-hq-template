import { createCompleteNativeHomesObservation, type CompleteNativeHomesObservation } from "../domain/native-homes";
import type { DeploymentResult } from "../domain/result";
import type { CompleteTargetIdentityReader } from "../ports/state";

export interface CompleteNativeHomesDependencies {
  readonly identities: CompleteTargetIdentityReader;
}

export type CompleteNativeHomesApplication = () => Promise<DeploymentResult<CompleteNativeHomesObservation>>;

export function createCompleteNativeHomesReader(
  dependencies: () => CompleteNativeHomesDependencies,
): CompleteNativeHomesApplication {
  return async () => {
    const ports = dependencies();
    const sidecars = await ports.identities.readAll();
    return sidecars.ok ? createCompleteNativeHomesObservation(sidecars.value) : sidecars;
  };
}
