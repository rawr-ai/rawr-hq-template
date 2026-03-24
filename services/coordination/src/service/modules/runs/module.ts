import { impl } from "../../impl";
import {
  analytics,
  observability,
  repository,
  runExecution,
} from "./middleware";
import { createRepository } from "./repository";

const baseModule = impl.runs
  .use(observability)
  .use(analytics);

export const routerBase = baseModule;

export const readModule = baseModule
  .use(repository)
  .use(async ({ context, next }) => next({
    context: {
      repo: context.provided.repo,
    },
  }));

export const queueRunModule = baseModule
  .use(runExecution)
  .use(async ({ context, next }) => next({
    context: {
      repo: createRepository(context.scope.repoRoot),
      runExecution: context.provided.runExecution,
    },
  }));
