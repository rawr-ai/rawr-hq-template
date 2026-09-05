import { isDeepStrictEqual } from "node:util";

import type { CompiledServiceBindingPlan } from "../../compiler/src/index";
import {
  type ConstructionBoundServiceClient,
  type RuntimeLaunchIdentity,
  runtimeLaunchIdentity,
} from "../../definition/src/index";

export interface ServiceBindingCacheKey {
  readonly identity: RuntimeLaunchIdentity;
  readonly profileId: string;
  readonly bindingId: string;
}

export interface ServiceBindingCache {
  getOrCreate(input: {
    readonly key: ServiceBindingCacheKey;
    readonly plan: CompiledServiceBindingPlan;
    readonly create: () => ConstructionBoundServiceClient;
  }): ConstructionBoundServiceClient;
}

export function createServiceBindingCache(): ServiceBindingCache {
  const entries = new Map<
    string,
    {
      readonly plan: CompiledServiceBindingPlan;
      readonly client: ConstructionBoundServiceClient;
    }
  >();
  const constructing = new Set<string>();
  return Object.freeze<ServiceBindingCache>({
    getOrCreate({ key, plan, create }) {
      if (key.bindingId !== plan.bindingId)
        throw new TypeError("Service cache key and binding disagree.");
      const identity = runtimeLaunchIdentity(key.identity);
      const cacheKey = JSON.stringify([
        identity.app,
        identity.process,
        identity.entrypoint,
        identity.deployment,
        identity.source,
        key.profileId,
        key.bindingId,
      ]);
      const previous = entries.get(cacheKey);
      if (previous !== undefined) {
        if (!isDeepStrictEqual(previous.plan, plan))
          throw new TypeError("Service binding cache collision.");
        return previous.client;
      }
      if (constructing.has(cacheKey))
        throw new TypeError("Service binding construction is cyclic.");
      constructing.add(cacheKey);
      try {
        const client = create();
        if (
          client.kind !== "service.client.construction-bound" ||
          client.serviceId !== plan.serviceId ||
          typeof client.withInvocation !== "function"
        ) {
          throw new TypeError("Service constructor returned a mismatched callable boundary.");
        }
        entries.set(cacheKey, { plan, client });
        return client;
      } finally {
        constructing.delete(cacheKey);
      }
    },
  });
}
