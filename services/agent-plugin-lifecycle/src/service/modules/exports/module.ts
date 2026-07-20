import { impl } from "../../impl";
import { selectArtifactReader } from "./model/helpers/artifact-reader";
import { analytics, observability } from "./middleware";

export const module = impl.exports
  .use(observability)
  .use(analytics)
  .use(async ({ context, next }) => {
    const exports = Object.freeze({
      artifactReader: selectArtifactReader(context.provided.artifactStore),
      knownNativeHomesReader: context.deps.exports.knownNativeHomesReader,
      undoWriter: context.deps.exports.undoWriter,
      destinationRuntime: context.deps.exports.destinationRuntime,
      failpoints: context.deps.exports.failpoints,
      operationId: context.deps.exports.operationId,
    });
    return next({ context: { exports } });
  });
