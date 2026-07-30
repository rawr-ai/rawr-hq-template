/**
 * @fileoverview Tag module runtime composition.
 *
 * @remarks
 * This file owns module composition only:
 * - start from the configured package-level service branch
 * - attach qualified Tags telemetry once
 * - curate the tag route context from inherited service capabilities
 * - export configured `module` for handler implementations
 */
import { service } from "../../impl";
import { telemetry } from "./middleware";

/**
 * SECTION: Module Composition (Always Present)
 *
 * Keep module-wide composition here so procedure handlers can stay focused on business logic.
 */
export const module = service.tags.use(telemetry).use(async ({ context, next }) =>
  next({
    context: {
      clock: context.deps.clock,
      identifierGenerator: context.deps.identifierGenerator,
      logger: context.deps.logger,
      workspaceId: context.scope.workspaceId,
      traceId: context.invocation.traceId,
      readOnly: context.config.readOnly,
      tagsStore: context.provided.tagsStore,
    },
  })
);
