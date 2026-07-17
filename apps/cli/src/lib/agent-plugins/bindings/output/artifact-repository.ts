import {
  createResourceArtifactReader,
  createResourceArtifactStore,
} from "@rawr/agent-plugin-lifecycle/ports/releases";
import { makeNodeArtifactRepositoryAsyncPort } from "@rawr/resource-agent-plugin-artifact-repository/providers/effect-platform-node";

import type { ArtifactStoreRoot } from "../../layout";

/** Selects the controller's Effect Platform Node artifact provider for one explicit root. */
export function createArtifactRepositoryStore(repositoryRoot: ArtifactStoreRoot) {
  return createResourceArtifactStore({
    repositoryRoot,
    repository: makeNodeArtifactRepositoryAsyncPort(),
  });
}

/** Selects the same provider as a read-only lifecycle projection. */
export function createArtifactRepositoryReader(repositoryRoot: ArtifactStoreRoot) {
  return createResourceArtifactReader({
    repositoryRoot,
    repository: makeNodeArtifactRepositoryAsyncPort(),
  });
}
