import { os } from "@orpc/server";

import type { InitialLifecycleContext, ReadyLifecycleContext } from "../base";

type ProviderContext =
  | InitialLifecycleContext
  | {
      readonly config?: undefined;
      readonly deps?: undefined;
      readonly invocation?: undefined;
      readonly provided?: undefined;
      readonly scope?: undefined;
    };

export const context = os.$context<ProviderContext>().middleware(({ context, next }) => {
  const { config, deps, invocation, provided, scope } = context;
  if (!config || !deps || !invocation || !provided || !scope) {
    throw new Error("Agent plugin lifecycle dependencies are not configured");
  }

  return next({
    context: {
      config,
      deps,
      invocation,
      provided,
      scope,
    } satisfies ReadyLifecycleContext,
  });
});
