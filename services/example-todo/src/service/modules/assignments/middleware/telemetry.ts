/**
 * @fileoverview Qualified Assignments telemetry for module and operation behavior.
 *
 * @remarks
 * This native oRPC middleware observes the inherited service context before
 * Assignments terminally curates its handler vocabulary. The service root owns
 * the single procedure lifecycle; this leaf contributes only
 * Assignments-specific span events, attributes, and structured logging.
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
 * Observes Assignments operations and successful assignment creation.
 *
 * @remarks
 * Attach this once to the `service.assignments` branch before context
 * curation. Completion remains nested inside the service-wide lifecycle so
 * the qualified event precedes the root success event.
 */
export const middleware = base.middleware(async ({ context, path, next }) => {
  const span = trace.getActiveSpan();
  const pathLabel = path.join(".");

  observe(() => {
    span?.setAttributes({
      "rawr.todo.module": "assignments",
      "rawr.todo.workspace_id": context.scope.workspaceId,
      "rawr.todo.invocation_trace_id": context.invocation.traceId,
    });
    span?.addEvent("todo.assignments.module.observed", {
      module: "assignments",
      path: pathLabel,
      workspace_id: context.scope.workspaceId,
    });
    context.deps.logger.info("todo.assignments.module", {
      layer: "module",
      module: "assignments",
      path: pathLabel,
      workspaceId: context.scope.workspaceId,
      invocationTraceId: context.invocation.traceId,
    });
  });

  const result = await next();

  if (pathLabel === "assignments.assign") {
    observe(() => {
      span?.addEvent("todo.assignments.assign.completed", {
        workspace_id: context.scope.workspaceId,
      });
    });
  }

  return result;
});
