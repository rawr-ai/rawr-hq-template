import { impl } from "../../impl";
import {
  analytics,
  observability,
  repository,
} from "./middleware";

export const module = impl.runs
  .use(observability)
  .use(analytics)
  .use(repository)
  .use(async ({ context, next }) => next({
    context: {
      repo: context.provided.repo,
      queueRun: context.deps.queueRun,
      createTraceLinks: context.deps.createTraceLinks,
      createEvent: context.deps.createEvent,
    },
  }));
