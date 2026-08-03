/**
 * @fileoverview In-process client factory for the hyperresearch-codex package boundary.
 */
import { createRouterClient, type InferRouterInitialContext } from "@orpc/server";
import { router } from "./service/router";

export type {
  HyperresearchAgentArtifactWrite,
  HyperresearchAgentJob,
  HyperresearchAgentJobStatus,
  HyperresearchAgentOutput,
  HyperresearchCliCall,
  HyperresearchCliOperation,
  HyperresearchCliResult,
  HyperresearchFailure,
  HyperresearchIntegrityFinding,
  HyperresearchPatchGuard,
  HyperresearchReportSnapshot,
  HyperresearchResumeEvent,
  HyperresearchReviewDisposition,
  HyperresearchRunLedger,
  HyperresearchSourceCapture,
  HyperresearchStepLoad,
  HyperresearchStepRecord,
  HyperresearchStepStatus,
  HyperresearchTier,
  HyperresearchV8RunLedger,
  V8RunStatus,
} from "./service/model/entities";
export type { HyperresearchCliBackend, HyperresearchCodexIO } from "./service/model/ports";

type RouterInitialContext = InferRouterInitialContext<typeof router>;
type Invocation = RouterInitialContext["invocation"];

/** Host-supplied hyperresearch capabilities fixed for the lifetime of one client. */
export type Deps = RouterInitialContext["deps"];
/** Stable hyperresearch binding identity fixed when the client is constructed. */
export type Scope = RouterInitialContext["scope"];
/** Stable hyperresearch behavior configuration fixed when the client is constructed. */
export type Config = RouterInitialContext["config"];
/** Construction boundary that fixes the client's dependency, scope, and configuration lanes. */
export type CreateClientOptions = Pick<RouterInitialContext, "deps" | "scope" | "config">;

/**
 * Constructs the native in-process hyperresearch client.
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

/** Callable hyperresearch surface derived from the router with per-call invocation context. */
export type Client = ReturnType<typeof createClient>;
