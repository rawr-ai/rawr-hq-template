import {
  createResourceArtifactReader,
  createResourceArtifactStore,
  createResourceMechanicalEvidenceReader,
  createResourceMechanicalEvidenceStore,
} from "@rawr/agent-plugin-lifecycle/bindings/releases";
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

/** Selects the artifact provider as the lifecycle service's evidence store. */
export function createMechanicalEvidenceStore(repositoryRoot: ArtifactStoreRoot) {
  return createResourceMechanicalEvidenceStore({
    repositoryRoot,
    repository: makeNodeArtifactRepositoryAsyncPort(),
  });
}

/** Selects the same evidence provider through its read-only service projection. */
export function createMechanicalEvidenceReader(repositoryRoot: ArtifactStoreRoot) {
  return createResourceMechanicalEvidenceReader({
    repositoryRoot,
    repository: makeNodeArtifactRepositoryAsyncPort(),
  });
}
