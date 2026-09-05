import type { CompiledSurfacePlan } from "../../../compiler/src/compiled-process-plan";
import { readExecutionProjection } from "../../../definition/src/execution";
import type { RuntimeResourceMap } from "../../../definition/src/provider";
import type { ExecutionDescriptorRef } from "../../../derivation/src/execution-descriptor-ref";
import type { WebRouteModuleRef } from "../../../derivation/src/web-route-module-table";
import type { SurfaceAdapter } from "../surface-adapter";

export interface WebModuleRoute {
  readonly kind: "web.module";
  readonly id: string;
  readonly path: string;
  readonly ref: WebRouteModuleRef;
  readonly load: () => Promise<unknown>;
}

export interface WebEffectRoute {
  readonly kind: "web.effect";
  readonly id: string;
  readonly path: string;
  readonly ref: Extract<ExecutionDescriptorRef, { readonly boundary: "plugin.web-surface" }>;
  handle(request: Request): Promise<Response>;
}

export interface WebHostPayload {
  readonly kind: "web/app";
  readonly routes: readonly (WebModuleRoute | WebEffectRoute)[];
}

/** Resolve only compiled references; native route modules remain cold until mounting. */
export function createWebAdapter(input: {
  readonly harness: string;
}): SurfaceAdapter<CompiledSurfacePlan, WebHostPayload> {
  return Object.freeze<SurfaceAdapter<CompiledSurfacePlan, WebHostPayload>>({
    role: "web",
    surface: "web/app",
    harness: input.harness,
    lower({ plan, resources, executionRegistry, executionRuntime, webRouteModuleTable }) {
      if (plan.role !== "web" || plan.surface !== "web/app" || executionRuntime === undefined)
        throw new TypeError(
          "Web lowering requires its selected plan and process execution runtime."
        );
      const context = Object.freeze({ resources });
      const routes: (WebModuleRoute | WebEffectRoute)[] = plan.webRouteModuleRefs.map((ref) => {
        if (webRouteModuleTable === undefined)
          throw new TypeError("Selected web modules require their route-module table.");
        return Object.freeze({
          kind: "web.module",
          id: ref.routeId,
          path: ref.path,
          ref,
          load: webRouteModuleTable.get(ref),
        });
      });
      for (const ref of plan.executionDescriptorRefs) {
        const boundary = executionRegistry.get<
          Request,
          Response,
          unknown,
          { readonly resources: RuntimeResourceMap }
        >(ref);
        const projection = readExecutionProjection(boundary.descriptor);
        if (ref.boundary !== "plugin.web-surface" || projection?.kind !== "web.route")
          throw new TypeError("Web boundary has no matching operational route projection.");
        routes.push(
          Object.freeze({
            kind: "web.effect",
            id: ref.surfaceId,
            path: projection.path,
            ref,
            handle(request: Request) {
              return executionRuntime.execute({
                boundary,
                invocation: { input: request, context, signal: request.signal },
              });
            },
          })
        );
      }
      routes.sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
      return Object.freeze({
        payload: Object.freeze({ kind: "web/app", routes: Object.freeze(routes) }),
        payloadSchemas: Object.freeze([]),
        findings: Object.freeze([]),
        observations: Object.freeze([
          Object.freeze({
            kind: "surface.lowered" as const,
            surfacePlanId: plan.surfacePlanId,
            executionIds: Object.freeze(plan.executionDescriptorRefs.map((ref) => ref.executionId)),
          }),
        ]),
      });
    },
  });
}
