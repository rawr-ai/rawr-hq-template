import { impl } from "../../impl";
import { analytics, observability } from "./middleware";

export const module = impl.releases
  .use(observability)
  .use(analytics)
  .use(async ({ context, next }) => next({
    context: {
      source: context.deps.releaseSource,
      stagedSource: context.deps.stagedReleaseSource,
      artifacts: context.deps.releaseArtifacts,
      evidence: context.deps.releaseEvidence,
      retention: context.deps.releaseRetention,
      buildFailpoint: context.deps.releaseBuildFailpoint,
      artifactFailpoint: context.deps.releaseArtifactFailpoint,
    },
  }));
