import { impl } from "../../impl";
import { analytics, observability, repositories } from "./middleware";

export const module = impl.releases
  .use(observability)
  .use(analytics)
  .use(repositories)
  .use(async ({ context, next }) => next({
    context: {
      source: context.provided.releaseSource,
      stagedSource: context.provided.stagedReleaseSource,
      artifacts: context.provided.artifactStore,
      evidence: context.provided.mechanicalEvidenceStore,
      retention: context.deps.releaseRetention,
      buildFailpoint: context.deps.releaseBuildFailpoint,
      artifactFailpoint: context.deps.releaseArtifactFailpoint,
    },
  }));
