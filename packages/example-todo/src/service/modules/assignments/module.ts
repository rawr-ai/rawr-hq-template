/**
 * @fileoverview Assignments module runtime composition.
 *
 * @remarks
 * This file owns module composition only:
 * - start from the package-level implementer base
 * - compose standalone module middleware from `./middleware`
 * - export configured `module` for handler implementations
 */
import { impl } from "../../impl";
import { analytics, observability, repositories } from "./middleware";

/**
 * SECTION: Module Composition (Always Present)
 *
 * Keep module-wide composition here so procedure handlers can stay focused on business logic.
 */
export const module = impl.assignments
  .use(async ({ context, next }) => next({
    context: {
      clock: context.deps.clock,
      logger: context.deps.logger,
      workspaceId: context.scope.workspaceId,
      traceId: context.invocation.traceId,
      maxAssignmentsPerTask: context.config.limits.maxAssignmentsPerTask,
    },
  }))
  .use(observability)
  .use(analytics)
  .use(repositories)
  .use(async ({ context, next }) => next({
    context: {
      repo: context.provided.repo,
      tasks: context.provided.tasks,
      tags: context.provided.tags,
    },
  }));
