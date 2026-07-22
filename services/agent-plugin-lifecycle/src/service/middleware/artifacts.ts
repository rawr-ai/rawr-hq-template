import type { ArtifactRepositoryAsyncPort } from "@rawr/resource-agent-plugin-artifact-repository";

import { createServiceProvider } from "../base";
import type { CurrentMainSelectionReader } from "../model/dependencies/current-main";
import type { ArtifactStore } from "../model/dependencies/releases";
import { createResourceArtifactStore } from "../repository/artifact-repository";
import { createResourceMechanicalEvidenceStore } from "../repository/mechanical-evidence";
import type { MechanicalEvidenceStore } from "../shared/release";

/** Derives the lifecycle-owned artifact and evidence capabilities from one raw repository. */
export const artifacts = createServiceProvider<{
  deps: {
    artifactRepository: ArtifactRepositoryAsyncPort;
    artifactRepositoryRoot: string;
  };
  provided: {
    currentMain: CurrentMainSelectionReader;
  };
}>().middleware<{
  artifactStore: ArtifactStore;
  mechanicalEvidenceStore: MechanicalEvidenceStore;
}>(async ({ context, next }) => {
  const binding = Object.freeze({
    repository: context.deps.artifactRepository,
    repositoryRoot: context.deps.artifactRepositoryRoot,
  });

  return next({
    artifactStore: createResourceArtifactStore(binding),
    mechanicalEvidenceStore: createResourceMechanicalEvidenceStore(binding),
  });
});
