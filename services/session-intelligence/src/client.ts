import { createRouterClient, type InferRouterInitialContext } from "@orpc/server";
import { router } from "./service/router";

export { type Contract, contract } from "./service/contract";
export type {
  CodexSessionFile,
  CodexSessionSource,
  DiscoveredSessionFile,
  RoleFilter,
  SessionFileStat,
  SessionListItem,
  SessionMessage,
  SessionSource,
  SessionSourceFilter,
  SessionStatus,
} from "./service/model/dto";
export type {
  DiscoverSessionsInput,
  SessionIndexBatch,
  SessionIndexRuntime,
  SessionIndexStatement,
  SessionSourceRuntime,
} from "./service/model/ports";
export type {
  SessionFacetFilters,
  SessionFacets,
} from "./service/modules/search/model/dto";

type RouterInitialContext = InferRouterInitialContext<typeof router>;

/** Host-supplied session capabilities fixed for the lifetime of one client. */
export type Deps = RouterInitialContext["deps"];
/** Stable session binding identity fixed when the client is constructed. */
export type Scope = RouterInitialContext["scope"];
/** Stable session behavior configuration fixed when the client is constructed. */
export type Config = RouterInitialContext["config"];
/** Per-call request facts supplied for one service invocation. */
export type Invocation = RouterInitialContext["invocation"];
/** Construction boundary that fixes the client's dependency, scope, and configuration lanes. */
export type CreateClientOptions = Pick<RouterInitialContext, "deps" | "scope" | "config">;

/**
 * Constructs the native in-process session-intelligence client.
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

/** Callable session surface derived from the router with per-call invocation context. */
export type Client = ReturnType<typeof createClient>;

/** Caller-visible result of resolving a session identity. */
export type ResolveResult = Awaited<ReturnType<Client["catalog"]["resolve"]>>;
/** Caller-visible normalized transcript. */
export type ExtractedSession = Awaited<ReturnType<Client["transcripts"]["extract"]>>;
/** Caller-visible metadata search match. */
export type MetadataSearchHit = Awaited<ReturnType<Client["search"]["metadata"]>>["hits"][number];
/** Caller-visible transcript search match. */
export type SearchHit = Awaited<ReturnType<Client["search"]["content"]>>["hits"][number];
/** Caller-visible facet search match. */
export type FacetSearchHit = Awaited<ReturnType<Client["search"]["facets"]>>["hits"][number];
/** Caller-visible search reindex result. */
export type ReindexResult = Awaited<ReturnType<Client["search"]["reindex"]>>;
