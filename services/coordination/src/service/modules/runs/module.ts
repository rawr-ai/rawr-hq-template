import { runsImpl } from "../../impl";
import {
  analytics,
  observability,
  repository,
} from "./middleware";

export const module = runsImpl
  .use(observability)
  .use(analytics)
  .use(repository)
  .use(async ({ context, next }) => next({
    context: {
      repo: context.provided.repo,
    },
  }));
