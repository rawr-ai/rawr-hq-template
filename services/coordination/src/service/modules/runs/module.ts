import { impl } from "../../impl";
import {
  analytics,
  observability,
  queueRepository,
  repository,
  runExecution,
} from "./middleware";

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
  .use(queueRepository)
  .use(async ({ context, next }) => next({
    context: {
      repo: context.provided.repo,
      runExecution: context.provided.runExecution,
    },
  }));
