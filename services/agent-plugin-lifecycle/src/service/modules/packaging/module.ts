import { impl } from "../../impl";
import type { ArtifactReader } from "../../model/dependencies/releases";
import { analytics, observability } from "./middleware";

export const module = impl.packaging
  .use(observability)
  .use(analytics)
  .use(async ({ context, next }) => next({
    context: {
      artifacts: Object.freeze({
        read: (ref: Parameters<ArtifactReader["read"]>[0]) =>
          context.provided.artifactStore.read(ref),
      }) satisfies ArtifactReader,
      packageOutput: context.deps.packageOutput,
    },
  }));
