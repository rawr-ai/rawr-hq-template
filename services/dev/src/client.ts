import { ChildProcessRuntimeResource } from "@habitat-ai/resource-child-process/runtime";
import { FilesystemRuntimeResource } from "@habitat-ai/resource-filesystem/runtime";
import { defineService, resourceDep, sealService } from "@habitat-ai/sdk/service";
import {
  createRouterClient,
  type InferRouterInitialContext,
  type RouterClient,
} from "@orpc/server";
import { Context as NativeContext } from "effect";
import type { Context } from "./service/base";
import { contract } from "./service/contract";
import { router } from "./service/router";

export { type Contract, contract } from "./service/contract";
export type {
  CommandStep,
  Issue,
  ScratchInput,
  ScratchReport,
  Worktree,
} from "./service/model/dto";
export type { RepoSyncInput, RepoSyncResult } from "./service/modules/repo/model/dto";
export type {
  GraphiteStack,
  StackDoctorInput,
  StackDoctorResult,
  StackDrainInput,
  StackDrainResult,
} from "./service/modules/stack/model/dto";
export type {
  WorktreeCleanupInput,
  WorktreeCleanupResult,
} from "./service/modules/worktree/model/dto";

type RouterInitialContext = InferRouterInitialContext<typeof router>;
type CallerContext = Partial<Pick<RouterInitialContext, "effect/context">>;

/** Ready capabilities needed by an unmanaged native client. */
export type CreateClientOptions = Pick<RouterInitialContext, "deps" | "scope" | "config">;

/** Typed local procedures, with optional native caller Effect context. */
export type Client = RouterClient<typeof router, CallerContext>;

/** Constructs the public local client without constructing a runtime or provider. */
export function createClient({ deps, scope, config }: CreateClientOptions): Client {
  return createRouterClient(router, {
    context: (caller: CallerContext) =>
      ({
        deps,
        scope,
        config,
        invocation: {},
        provided: {},
        "effect/context": caller["effect/context"] ?? NativeContext.empty(),
      }) satisfies RouterInitialContext,
  });
}

/** Cold native dependency declaration; command targets are explicit per-invocation inputs. */
export const definition = defineService({
  id: "habitat.dev",
  deps: {
    filesystem: resourceDep(FilesystemRuntimeResource),
    childProcess: resourceDep(ChildProcessRuntimeResource),
  },
});

/** Uses the process-owned official Effect context and native service-client boundary. */
export const serviceRuntimeExport = sealService(definition, {
  contract,
  construct: ({ clients, deps }) => ({
    kind: "service.client.construction-bound",
    serviceId: definition.id,
    withInvocation: () =>
      clients.bind({
        context: () =>
          ({
            deps: { filesystem: deps.filesystem, childProcess: deps.childProcess },
            scope: {},
            config: {},
            invocation: {},
            provided: {},
          }) satisfies Context,
        createNativeClient: (options) => createRouterClient(router, options),
      }),
  }),
});
