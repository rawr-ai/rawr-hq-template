/**
 * @fileoverview Tag module router implementation.
 *
 * @remarks
 * Module composition lives in `./module.ts`.
 * This file owns concrete handler implementations and exports plain-object `router`.
 *
 * @agents
 * `contract.ts` owns boundary shape (input/output/errors/meta).
 * `module.ts` owns module composition.
 * This file owns handler behavior and router composition.
 *
 * The `create` procedure below is the canonical example of procedure-local
 * observability/analytics attachment. Do not remove that example unless the
 * package adopts a different deliberate seam for demonstrating procedure-local
 * middleware.
 */
import { randomUUID } from "node:crypto";
import { module } from "./module";
import {
  createProcedureAnalytics,
  createProcedureObservability,
} from "./middleware";
import { type Tag } from "./schemas";

/**
 * SECTION: Module Procedure Implementations (Always Present)
 *
 * Implement concrete procedure handlers below using `module.<procedure>.handler(...)`.
 */
/**
 * Canonical procedure-local observability example.
 *
 * @remarks
 * The module already has module-wide observability and analytics via
 * `module.ts`. This procedure adds one extra, procedure-specific layer on top
 * to show how a handler can opt into more local instrumentation without
 * changing the module default.
 *
 * @agents
 * Keep this example as the one obvious demonstration of procedure-local
 * additive middleware in the package.
 */
const create = module.create
  .use(createProcedureObservability({
    onStart: ({ span, context }) => {
      span?.addEvent("todo.tags.create.normalization.started", {
        workspace_id: context.workspaceId,
      });
    },
    onSuccess: ({ span, context }) => {
      span?.addEvent("todo.tags.create.normalization.succeeded", {
        workspace_id: context.workspaceId,
      });
    },
  }))
  .use(createProcedureAnalytics({
    payload: ({ context, outcome }) => ({
      analytics_layer: "procedure",
      analytics_procedure: "tags.create",
      analytics_outcome: outcome,
      analytics_workspace_id: context.workspaceId,
      analytics_trace_id: context.traceId,
    }),
  }))
  .handler(async ({ context, input, errors }) => {
    const normalizedName = input.name.trim();
    const normalizedColor = input.color.toLowerCase();

    if (await context.repo.existsByName(normalizedName)) {
      throw errors.DUPLICATE_TAG({
        message: `Tag '${normalizedName}' already exists`,
        data: { name: normalizedName },
      });
    }

    const tag: Tag = {
      id: randomUUID(),
      workspaceId: context.workspaceId,
      name: normalizedName,
      color: normalizedColor,
      createdAt: context.clock.now(),
    };

    context.logger.info("todo.tags.create", { tagId: tag.id, name: tag.name });
    return await context.repo.insert(tag);
  });

const list = module.list.handler(async ({ context }) => {
  return await context.repo.findAll();
});

/** Contract-enforced module router (fails typecheck if contract and router drift). */
export const router = module.router({
  create,
  list
});
