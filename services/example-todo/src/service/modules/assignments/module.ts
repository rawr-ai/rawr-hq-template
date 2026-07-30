/**
 * @fileoverview Assignments module runtime composition.
 *
 * @remarks
 * This file owns module composition only:
 * - start from the configured package-level service branch
 * - attach qualified Assignments telemetry once
 * - curate the assignment route context from inherited service capabilities
 * - export configured `module` for handler implementations
 */
import { service } from "../../impl";
import { telemetry } from "./middleware";

/**
 * SECTION: Module Composition (Always Present)
 *
 * Keep module-wide composition here so procedure handlers can stay focused on business logic.
 */
export const module = service.assignments.use(telemetry).use(async ({ context, next }) =>
  next({
    context: {
      clock: context.deps.clock,
      identifierGenerator: context.deps.identifierGenerator,
      workspaceId: context.scope.workspaceId,
      maxAssignmentsPerTask: context.config.limits.maxAssignmentsPerTask,
      readOnly: context.config.readOnly,
      assignmentsStore: context.provided.assignmentsStore,
      tasksStore: context.provided.tasksStore,
      tagsStore: context.provided.tagsStore,
    },
  })
);
