import type { ArtifactTreeLocation } from "@rawr/resource-agent-plugin-artifact-repository";

import type { ProviderMarketplaceSource } from "./state";

/** Resolves a semantic marketplace projection to one admitted provider input. */
export interface ProviderMarketplaceLocationResolver {
  readonly locate: (source: ProviderMarketplaceSource) => Promise<ArtifactTreeLocation>;
}
