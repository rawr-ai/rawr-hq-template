import { impl } from "../../impl";
import { analytics, observability, resources } from "./middleware";

export const module = impl.providers
  .use(observability)
  .use(analytics)
  .use(resources)
  .use(async ({ context, next }) => next({
    context: {
      currentMain: context.deps.providerCurrentMain,
      native: context.provided.native,
      releases: context.provided.releases,
      provider: context.provided.provider,
      providerMutator: context.provided.providerMutator,
      receipts: context.provided.receipts,
      receiptWriter: context.provided.receiptWriter,
      identities: context.provided.identities,
      identityWriter: context.provided.identityWriter,
      projectionMaterializer: context.provided.projectionMaterializer,
      marketplaceMaterializer: context.provided.marketplaceMaterializer,
      evidence: context.provided.evidence,
    },
  }));
