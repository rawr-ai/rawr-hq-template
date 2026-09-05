import type { RouterContract } from "@orpc/contract";
import {
  DEFAULT_OPENAPI_METHOD,
  getDynamicPathParams,
  getOpenAPIMeta,
  OpenAPIGenerator,
} from "@orpc/openapi";
import { walkProcedureContractsAsync } from "@orpc/server";
import { mergeHttpPath, pathToHttpPath } from "@orpc/shared";
import { routesOverlap } from "rou3";
import type {
  ElysiaRoutePayload,
  MountReadySurfaceRuntimeRecord,
} from "../../process-runtime/src/index";
import type { ElysiaHarnessConfig } from "./index";

/** Generate once from native document-only contracts, never merge generated documents. */
export async function createPublicDocument(
  records: readonly MountReadySurfaceRuntimeRecord<ElysiaRoutePayload>[],
  publication: ElysiaHarnessConfig["publicDocument"]
): Promise<string | undefined> {
  const contracts: Record<string, RouterContract> = Object.create(null);
  const routes: {
    readonly owner: string;
    readonly method: string;
    readonly path: `/${string}`;
    readonly pattern?: string;
  }[] = [];
  const hasPublic = records.some((record) => record.payload.kind === "server/api");
  if (hasPublic && publication === undefined)
    throw new TypeError("Public server surfaces require explicit publication configuration.");
  if (hasPublic && publication !== undefined) {
    for (const { payload } of records) {
      if (await payload.matches("GET", publication.path as `/${string}`))
        throw new TypeError("The publication path is claimed by a native handler.");
    }
  }
  for (const record of records) {
    if (record.payload.kind === "server/internal") {
      for (const route of await record.payload.routes())
        routes.push({ owner: record.surfacePlanId, ...route });
      continue;
    }
    if (Object.hasOwn(contracts, record.surfacePlanId))
      throw new TypeError("A public server surface is duplicated.");
    const contract = await record.payload.document();
    contracts[record.surfacePlanId] = contract;
    await walkProcedureContractsAsync(contract, (procedure, path) => {
      const meta = getOpenAPIMeta(procedure);
      const localPath = meta?.path ?? pathToHttpPath(path);
      const fullPath = meta?.prefix ? mergeHttpPath(meta.prefix, localPath) : localPath;
      const method = meta?.method ?? DEFAULT_OPENAPI_METHOD;
      if (routes.some((route) => route.method === method && route.path === fullPath))
        throw new TypeError("Public HTTP routes conflict.");
      routes.push({
        owner: record.surfacePlanId,
        method,
        path: fullPath,
        pattern: nativePattern(fullPath),
      });
    });
  }
  for (const route of routes) {
    const pattern = route.pattern;
    if (pattern !== undefined) {
      if (
        routes.some(
          (other) =>
            other.owner !== route.owner &&
            other.method === route.method &&
            other.pattern !== undefined &&
            routesOverlap(pattern, other.pattern)
        )
      )
        throw new TypeError("Native public route ownership conflicts across server surfaces.");
      continue;
    }
    // RPC paths are literals, not rou3 patterns; ask the actual peer matcher.
    for (const record of records) {
      if (
        record.surfacePlanId !== route.owner &&
        (await record.payload.matches(route.method, route.path))
      )
        throw new TypeError("Native HTTP route ownership conflicts across server surfaces.");
    }
  }
  if (!hasPublic || publication === undefined) return undefined;
  const document = await new OpenAPIGenerator().generate(contracts, {
    base: { info: publication.info },
  });
  return JSON.stringify(document);
}

/** The pinned oRPC matcher projects these native params into its rou3 engine. */
function nativePattern(input: `/${string}`): string {
  const params = getDynamicPathParams(input) ?? [];
  let path: string = input;
  for (const param of [...params].reverse()) {
    const pattern = param.allowsSlash ? `**:${param.parameterName}` : `:${param.parameterName}`;
    path =
      path.slice(0, param.startIndex) +
      pattern +
      path.slice(param.startIndex + param.segment.length);
  }
  return path;
}
