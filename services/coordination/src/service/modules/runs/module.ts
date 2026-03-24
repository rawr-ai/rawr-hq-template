import { impl } from "../../impl";
import {
  analytics,
  observability,
  repository,
  runExecution,
} from "./middleware";

export const module = impl.runs
  .use(observability)
  .use(analytics)
  .use(runExecution)
  .use(repository)
  .use(async ({ context, next }) => next({
    context: {
      repo: context.provided.repo,
    },
  }));
