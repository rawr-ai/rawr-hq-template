/**
 * @fileoverview In-process client factory for the coordination package boundary.
 *
 * @remarks
 * This file owns canonical client creation (`createClient`) and package-boundary
 * wiring only. Keep transport/runtime projection out of this surface.
 */
import { createRouterClient } from "@orpc/server";
import {
  type InferConfig,
  type InferDeps,
  type InferInvocation,
  type InferScope,
  type ServicePackageBoundary,
} from "@rawr/hq-sdk/boundary";
import { router } from "./router";
import type { CoordinationRunsRuntime } from "./service/modules/runs/runtime";

export type Deps = InferDeps<typeof router>;
export type Scope = InferScope<typeof router>;
export type Config = InferConfig<typeof router>;
type CoordinationClientBoundary = ServicePackageBoundary<typeof router>;

export type CreateClientOptions = CoordinationClientBoundary & Readonly<{
  runs: {
    runtime: CoordinationRunsRuntime;
  };
}>;

export function createClient(boundary: CreateClientOptions) {
  const { runs, ...serviceBoundary } = boundary;

  return createRouterClient(router, {
    context: (clientContext: { invocation: InferInvocation<typeof router> }) => ({
      deps: serviceBoundary.deps,
      scope: serviceBoundary.scope,
      config: serviceBoundary.config,
      invocation: {
        ...(clientContext.invocation as object),
      } as InferInvocation<typeof router>,
      provided: {
        runsRuntime: runs.runtime,
      },
    }),
  });
}

export type Client = ReturnType<typeof createClient>;
