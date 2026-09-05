import type { ExecutionDescriptorRef } from "./execution-descriptor-ref";
import type { SurfaceRuntimePlan } from "./surface-runtime-plan";
import type { WebRouteModuleRef } from "./web-route-module-table";

/** Validates already-normalized data; only admitted definition carriers create membership. */
export function assertSurfaceReferenceRelation(
  surface: Pick<SurfaceRuntimePlan, "role" | "surface">,
  ref: ExecutionDescriptorRef | WebRouteModuleRef
): void {
  if (ref.kind === "web.route-module-ref") {
    if (surface.role !== "web" || surface.surface !== "web/app") {
      throw new TypeError("A web route-module ref requires its web/app surface.");
    }
    return;
  }
  switch (ref.boundary) {
    case "plugin.async-step": {
      const expected =
        "workflowId" in ref
          ? "async/workflow"
          : "scheduleId" in ref
            ? "async/schedule"
            : "async/consumer";
      if (surface.role !== "async" || surface.surface !== expected) {
        throw new TypeError("An async execution ref requires its matching parent surface.");
      }
      return;
    }
    case "plugin.agent-tool":
      if (surface.role !== "agent" || surface.surface !== "agent/tools") {
        throw new TypeError("An agent tool ref requires its agent/tools surface.");
      }
      return;
    case "plugin.desktop-background":
      if (surface.role !== "desktop" || surface.surface !== "desktop/background") {
        throw new TypeError("A desktop background ref requires its desktop/background surface.");
      }
      return;
    case "plugin.cli-command":
    case "plugin.web-surface":
      throw new TypeError("The execution ref has no admitted definition-owned lane carrier.");
  }
}
