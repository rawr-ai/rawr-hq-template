import { oc, type RouterContract } from "@orpc/contract";
import { openapi, populateRouterContractOpenAPIPaths } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIMatcher } from "@orpc/openapi/standard";
import { unlazyRouter, walkProcedureContractsAsync } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { RPC_DEFAULT_ALLOW_METHODS, RPCMatcher } from "@orpc/server/standard";
import { mergeHttpPath, pathToHttpPath } from "@orpc/shared";

import type { CompiledSurfacePlan } from "../../../compiler/src/index";
import type { NativeServerRequestContext } from "../server-request";
import type { SurfaceAdapter } from "../surface-adapter";

export type NativeServerFetchResult =
  | { readonly matched: true; readonly response: Response }
  | { readonly matched: false };

interface ElysiaRouteBase {
  readonly routeBase: `/${string}`;
  handle(request: Request): Promise<NativeServerFetchResult>;
  matches(method: string, pathname: `/${string}`): Promise<boolean>;
}

export type ElysiaRoutePayload =
  | (ElysiaRouteBase & {
      readonly kind: "server/api";
      document(): Promise<RouterContract>;
    })
  | (ElysiaRouteBase & {
      readonly kind: "server/internal";
      routes(): Promise<readonly { readonly method: string; readonly path: `/${string}` }[]>;
    });

function createElysiaAdapter(
  surface: "server/api" | "server/internal",
  harness: string
): SurfaceAdapter<CompiledSurfacePlan, ElysiaRoutePayload> {
  return Object.freeze<SurfaceAdapter<CompiledSurfacePlan, ElysiaRoutePayload>>({
    role: "server",
    surface,
    harness,
    lower({ plan, nativeServer }) {
      if (
        plan.role !== "server" ||
        plan.surface !== surface ||
        nativeServer?.source.kind !== surface
      )
        throw new TypeError(
          "Native server lowering requires its exact selected source and request assembly."
        );
      const { source, requests } = nativeServer;
      const router = source.createRouter();
      const options = { clientInterceptors: requests.clientInterceptors };
      const handler =
        surface === "server/api"
          ? new OpenAPIHandler<NativeServerRequestContext>(router, options)
          : new RPCHandler<NativeServerRequestContext>(router, options);
      const matcher =
        surface === "server/api" ? new OpenAPIMatcher(router) : new RPCMatcher(router);
      const base: ElysiaRouteBase = {
        routeBase: source.routeBase,
        handle(request) {
          return handler.handle(request, {
            prefix: source.routeBase,
            context: requests.context(request),
          });
        },
        async matches(method, pathname) {
          return (await matcher.match(method, pathname, source.routeBase)) !== undefined;
        },
      };
      const payload: ElysiaRoutePayload =
        surface === "server/api"
          ? Object.freeze({
              ...base,
              kind: "server/api",
              async document() {
                // The contract-only projection preserves local default paths before host aggregation.
                return oc
                  .meta(openapi.prefix(source.routeBase))
                  .router(populateRouterContractOpenAPIPaths(await unlazyRouter(router)));
              },
            })
          : Object.freeze({
              ...base,
              kind: "server/internal",
              async routes() {
                const routes: { readonly method: string; readonly path: `/${string}` }[] = [];
                await walkProcedureContractsAsync(router, (_procedure, path) => {
                  const pathname = mergeHttpPath(source.routeBase, pathToHttpPath(path));
                  for (const method of RPC_DEFAULT_ALLOW_METHODS)
                    routes.push(Object.freeze({ method, path: pathname }));
                });
                return Object.freeze(routes);
              },
            });
      return Object.freeze({
        payload,
        payloadSchemas: Object.freeze([]),
        findings: Object.freeze([]),
        observations: Object.freeze([
          Object.freeze({
            kind: "surface.lowered",
            surfacePlanId: plan.surfacePlanId,
            executionIds: Object.freeze([]),
          }),
        ]),
      });
    },
  });
}

export function createElysiaApiAdapter(input: {
  readonly harness: string;
}): SurfaceAdapter<CompiledSurfacePlan, ElysiaRoutePayload> {
  return createElysiaAdapter("server/api", input.harness);
}

export function createElysiaInternalAdapter(input: {
  readonly harness: string;
}): SurfaceAdapter<CompiledSurfacePlan, ElysiaRoutePayload> {
  return createElysiaAdapter("server/internal", input.harness);
}
