import { createRouterClient, type InferRouterInitialContext } from "@orpc/server";
import { router } from "./service/router";

export { type Contract, contract } from "./service/contract";
export type {
  RawSourceMaterials,
  WorkspaceArtifactBundle,
  WorkspaceArtifactFile,
  WorkspaceDirectoryEntry,
  WorkspaceFileEntry,
  WorkspaceManagedFile,
  WorkspaceMaterializeResult,
  WorkspaceScaffoldResult,
  WorkspaceSourceDirectories,
  WorkspaceStore,
  WorkspaceTemplate,
  WorkspaceTextEntry,
} from "./service/model/ports";

type RouterInitialContext = InferRouterInitialContext<typeof router>;
type Invocation = RouterInitialContext["invocation"];

/** Host-supplied corpus capabilities fixed for the lifetime of one client. */
export type Deps = RouterInitialContext["deps"];
/** Stable corpus binding identity fixed when the client is constructed. */
export type Scope = RouterInitialContext["scope"];
/** Stable corpus behavior configuration fixed when the client is constructed. */
export type Config = RouterInitialContext["config"];
/** Construction boundary that fixes the client's dependency, scope, and configuration lanes. */
export type CreateClientOptions = Pick<RouterInitialContext, "deps" | "scope" | "config">;

/**
 * Constructs the native in-process corpus client.
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

/** Callable corpus surface derived from the router with per-call invocation context. */
export type Client = ReturnType<typeof createClient>;
