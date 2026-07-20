import type {
  ArtifactRepositoryAsyncPort,
  ArtifactTreeLocationObservation,
} from "@rawr/resource-agent-plugin-artifact-repository";

import { NativeProviderPreMutationRefusal } from "../model/errors/native-resource";
import type { ProviderMarketplaceLocationResolver } from "../model/repositories/marketplace-location";
import type { ProviderMarketplaceSource } from "../model/repositories/state";
import { NATIVE_PACKAGE_READ_LIMITS } from "./resource-package";
import {
  providerTreeAddress,
  sameProviderTreeAddress,
} from "./resource-tree-address";

export interface ResourceMarketplaceLocationResolverOptions {
  readonly repository: Pick<ArtifactRepositoryAsyncPort, "locateTree">;
  readonly projectionRepositoryRoot: string;
}

/** Admits the exact immutable marketplace tree before exposing its opaque location. */
export function createResourceMarketplaceLocationResolver(
  options: ResourceMarketplaceLocationResolverOptions,
): ProviderMarketplaceLocationResolver {
  return Object.freeze({
    async locate(source: ProviderMarketplaceSource) {
      const address = providerTreeAddress(options.projectionRepositoryRoot, {
        kind: "marketplace",
        projectionDigest: source.projectionDigest,
        sourceDigest: source.sourceDigest,
      });
      let observation: ArtifactTreeLocationObservation;
      try {
        observation = await options.repository.locateTree({
          address,
          limits: NATIVE_PACKAGE_READ_LIMITS,
        });
      } catch (error) {
        throw locationFailure(
          `Marketplace projection ${source.projectionDigest} location failed: ${failureDetail(error)}`,
        );
      }

      if (!sameProviderTreeAddress(observation.address, address)) {
        throw locationFailure("Artifact repository returned a foreign marketplace projection address");
      }
      if (observation.kind === "Present") return observation.location;
      if (observation.kind === "Missing") {
        throw locationFailure(`Marketplace projection ${source.projectionDigest} is not materialized`);
      }
      throw locationFailure(
        `Marketplace projection ${source.projectionDigest} failed mechanical admission: ${observation.issues
          .map((entry) => entry.detail)
          .join("; ")}`,
      );
    },
  });
}

function locationFailure(detail: string): NativeProviderPreMutationRefusal {
  return new NativeProviderPreMutationRefusal(detail);
}

function failureDetail(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (
    error !== null
    && typeof error === "object"
    && "detail" in error
    && typeof error.detail === "string"
  ) return error.detail;
  return String(error);
}
