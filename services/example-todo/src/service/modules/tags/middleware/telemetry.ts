/**
 * @fileoverview Qualified Tags telemetry for module and operation behavior.
 *
 * @remarks
 * This native oRPC middleware observes the inherited service context before
 * Tags terminally curates its handler vocabulary. The service root owns the
 * single procedure lifecycle; this leaf contributes only Tags-specific span
 * events, attributes, and structured logging.
 */

import { trace } from "@opentelemetry/api";
import { base } from "../../../base";

function observe(action: () => void): void {
  try {
    action();
  } catch {
    // Telemetry never replaces the operation outcome.
  }
}

/**
 * Observes Tags operations and the tag-creation normalization phase.
 *
 * @remarks
 * Attach this once to the `service.tags` branch before context curation. Its
 * success event runs inside the root service lifecycle, preserving qualified
 * completion before the service-wide success event.
 */
export const middleware = base.middleware(async ({ context, path, next }) => {
  const span = trace.getActiveSpan();
  const pathLabel = path.join(".");

  observe(() => {
    span?.setAttributes({
      "rawr.todo.module": "tags",
      "rawr.todo.workspace_id": context.scope.workspaceId,
      "rawr.todo.invocation_correlation_id": context.invocation.correlationId,
    });
    span?.addEvent("todo.tags.module.observed", {
      module: "tags",
      path: pathLabel,
      workspace_id: context.scope.workspaceId,
    });
    context.deps.logger.info("todo.tags.module", {
      layer: "module",
      module: "tags",
      path: pathLabel,
      workspaceId: context.scope.workspaceId,
      invocationCorrelationId: context.invocation.correlationId,
    });

    if (pathLabel === "tags.create") {
      span?.addEvent("todo.tags.create.normalization.started", {
        workspace_id: context.scope.workspaceId,
      });
    }
  });

  const result = await next();

  if (pathLabel === "tags.create") {
    observe(() => {
      span?.addEvent("todo.tags.create.normalization.succeeded", {
        workspace_id: context.scope.workspaceId,
      });
    });
  }

  return result;
});
