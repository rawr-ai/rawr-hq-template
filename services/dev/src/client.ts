import { createRouterClient, type InferRouterInitialContext } from "@orpc/server";
import { router } from "./service/router";

type RouterInitialContext = InferRouterInitialContext<typeof router>;
type Invocation = RouterInitialContext["invocation"];

/** Host-supplied development capabilities fixed for the lifetime of one client. */
export type Deps = RouterInitialContext["deps"];
/** Stable development binding identity fixed when the client is constructed. */
export type Scope = RouterInitialContext["scope"];
/** Stable development behavior configuration fixed when the client is constructed. */
export type Config = RouterInitialContext["config"];
/** Construction boundary that fixes the client's dependency, scope, and configuration lanes. */
export type CreateClientOptions = Pick<RouterInitialContext, "deps" | "scope" | "config">;

/**
 * Constructs the native in-process development client.
 *
 * Each call contributes only invocation facts; construction lanes and the
 * empty provided context remain owner-controlled.
 */
export function createClient({ deps, scope, config }: CreateClientOptions) {
  return createRouterClient(router, {
    context: ({ invocation }: { invocation: Invocation }) =>
      ({
        deps,
        scope,
        config,
        invocation: { ...invocation },
        provided: {},
      }) satisfies RouterInitialContext,
  });
}

/** Callable development surface derived from the router with per-call invocation context. */
export type Client = ReturnType<typeof createClient>;

/** Public declarative contract for development-operation consumers. */
export { type Contract, contract } from "./service/contract";

/** Shared operation-report types returned across the Dev capability suite. */
export type {
  DevCommandStep,
  DevIssue,
  DevopsAction,
  DevPreflight,
} from "./service/model/dto/operation-outcomes.dto";

/** Shared scratch-policy request and observation types used by guarded operations. */
export type {
  ScratchPolicyCheck,
  ScratchPolicyInput,
} from "./service/model/dto/scratch-policy.dto";

/** Host capability contracts implemented by the concrete Dev environment adapter. */
export type {
  DevClockResource,
  DevDirEntry,
  DevExecResult,
  DevFileStat,
  DevFileSystemResource,
  DevPathResource,
  DevProcessResource,
  DevResources,
} from "./service/model/ports/dev-resources";

/** Repository synchronization request and result types. */
export type {
  RepoSyncUpstreamInput,
  RepoSyncUpstreamResult,
} from "./service/modules/repo/model/dto/repo-operations.dto";

/** Stack diagnosis and drain request and result types. */
export type {
  StackDoctorInput,
  StackDoctorResult,
  StackDrainInput,
  StackDrainResult,
} from "./service/modules/stack/model/dto/stack-operations.dto";

/** Worktree cleanup request and result types. */
export type {
  WorktreeCleanupInput,
  WorktreeCleanupResult,
} from "./service/modules/worktree/model/dto/worktree-operations.dto";
