import { impl } from "../../impl";
import { analytics, observability } from "./middleware";

export const module = impl.transcripts
  .use(observability)
  .use(analytics)
  .use(async ({ context, next }) => next({
    context: {
      sourceRuntime: context.deps.sessionSourceRuntime,
    },
  }));
