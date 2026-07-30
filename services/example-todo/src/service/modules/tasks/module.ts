/**
 * @fileoverview Task module runtime composition.
 *
 * @remarks
 * This file owns module composition only:
 * - start from the configured package-level service branch
 * - curate the task route context from inherited service capabilities
 * - export configured `module` for handler implementations
 */
import { service } from "../../impl";

/**
 * SECTION: Module Composition (Always Present)
 *
 * Keep module-wide composition here so procedure handlers can stay focused on business logic.
 */
export const module = service.tasks.use(async ({ context, next }) =>
  next({
    context: {
      clock: context.deps.clock,
      identifierGenerator: context.deps.identifierGenerator,
      logger: context.deps.logger,
      workspaceId: context.scope.workspaceId,
      readOnly: context.config.readOnly,
      tasksStore: context.provided.tasksStore,
    },
  })
);
