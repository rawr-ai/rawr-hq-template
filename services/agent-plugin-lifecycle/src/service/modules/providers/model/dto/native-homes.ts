import { canonicalDigest, compareCanonical, type CanonicalValue } from "../helpers/canonical";
import { createTargetIdentitySidecar, type TargetIdentitySidecar } from "../policy/state-machine";
import { failure, issue, success, type DeploymentResult } from "../errors/deployment-result";
import { parseProviderTarget } from "./provider-target";

declare const completeHomesDigestBrand: unique symbol;

export type CompleteNativeHomesDigest = string & { readonly [completeHomesDigestBrand]: "CompleteNativeHomesDigest" };

export interface CompleteNativeHomesObservation {
  readonly protocol: "agent-provider-native-homes@v1";
  readonly homes: readonly TargetIdentitySidecar[];
  readonly observationDigest: CompleteNativeHomesDigest;
}

export function createCompleteNativeHomesObservation(
  sidecars: readonly TargetIdentitySidecar[],
): DeploymentResult<CompleteNativeHomesObservation> {
  const homes = [...sidecars].sort((left, right) => compareCanonical(left.targetDigest, right.targetDigest));
  const targetDigests = new Set<string>();
  const homeKeys = new Set<string>();
  for (const sidecar of homes) {
    const parsedTarget = parseProviderTarget({
      provider: sidecar.provider,
      home: sidecar.canonicalHome,
    });
    if (!parsedTarget.ok) return parsedTarget;
    const expected = createTargetIdentitySidecar(parsedTarget.value);
    if (expected.targetDigest !== sidecar.targetDigest || expected.identityDigest !== sidecar.identityDigest) {
      return failure([issue("INVALID_TARGET", "nativeHomes", "Target identity sidecar digest is invalid", expected.identityDigest, sidecar.identityDigest)]);
    }
    const homeKey = `${sidecar.provider}\u0000${sidecar.canonicalHome}`;
    if (targetDigests.has(sidecar.targetDigest) || homeKeys.has(homeKey)) {
      return failure([issue("DUPLICATE_TARGET", "nativeHomes", "Complete native-home observation contains a duplicate or aliased target")]);
    }
    targetDigests.add(sidecar.targetDigest);
    homeKeys.add(homeKey);
  }
  const body = { protocol: "agent-provider-native-homes@v1" as const, homes: Object.freeze(homes) };
  return success(Object.freeze({
    ...body,
    observationDigest: canonicalDigest("nh1_", nativeHomesValue(body)) as CompleteNativeHomesDigest,
  }));
}

export function nativeHomesValue(
  observation: Pick<CompleteNativeHomesObservation, "homes" | "protocol">,
): CanonicalValue {
  return {
    protocol: observation.protocol,
    homes: observation.homes.map((sidecar) => ({
      schemaVersion: sidecar.schemaVersion,
      provider: sidecar.provider,
      canonicalHome: sidecar.canonicalHome,
      targetDigest: sidecar.targetDigest,
      identityDigest: sidecar.identityDigest,
    })),
  };
}
