import {
  createResourceArtifactReader,
} from "@rawr/agent-plugin-lifecycle/bindings/releases";
import { makeNodeArtifactRepositoryAsyncPort } from "@rawr/resource-agent-plugin-artifact-repository/providers/effect-platform-node";

import type { ArtifactStoreRoot } from "../../layout";

/** Selects the controller's transitional read-only export projection. */
export function createArtifactRepositoryReader(repositoryRoot: ArtifactStoreRoot) {
  return createResourceArtifactReader({
    repositoryRoot,
    repository: makeNodeArtifactRepositoryAsyncPort(),
  });
}
