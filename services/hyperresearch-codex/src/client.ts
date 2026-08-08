/**
 * @fileoverview In-process client factory for the hyperresearch-codex package boundary.
 */
import { createRouterClient, type InferRouterInitialContext } from "@orpc/server";
import { router } from "./service/router";

export { type Contract, contract } from "./service/contract";
export type { HyperresearchIntegrityFinding } from "./service/model/dto";
export type {
  HyperresearchAgentJob,
  HyperresearchAgentJobStatus,
  HyperresearchCliCall,
  HyperresearchCliOperation,
  HyperresearchFailure,
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
} from "./service/model/entities";
export type {
  HyperresearchCliBackend,
  HyperresearchCliResult,
  HyperresearchCodexIO,
} from "./service/model/ports";
export type {
  HyperresearchAgentArtifactWrite,
  HyperresearchAgentOutput,
  V8RunStatus,
} from "./service/modules/runs/model/dto";
export type { HyperresearchV8RunLedger } from "./service/modules/runs/model/entities";

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
