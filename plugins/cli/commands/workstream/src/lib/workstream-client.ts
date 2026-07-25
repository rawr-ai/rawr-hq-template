/**
 * @fileoverview Binds the workstream-frame service for CLI commands.
 *
 * @remarks
 * This is the composition edge. The plugin declares *use* of the service and
 * owns CLI input/output policy; it does not own experiment truth. Provider
 * construction happens here because that is where the shipped `bindService`
 * path puts it today.
 *
 * In the target architecture this selection moves up to an HQ app runtime
 * profile, and the plugin receives an already-bound client. That migration is
 * recorded as a deferred item in the workstream record rather than faked here.
 */
import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import { bindService, type ServiceBinding, type ServiceBindingContext } from "@rawr/hq-sdk/plugins";
import { createFlureeHttpSemanticLedgerPort } from "@rawr/resource-semantic-ledger/providers/fluree-http";
import { type Client, type CreateClientOptions, createClient } from "@rawr/workstream-frame/client";

/** In-process client for the work-stream frame service. */
export type WorkstreamClient = Client;

/** Default Fluree location when neither flag nor environment supplies one. */
export const DEFAULT_LEDGER_URL = "http://localhost:8090";

/** Default ledger identity, in Fluree's `name:branch` form. */
export const DEFAULT_LEDGER_NAME = "workstream:main";

type WorkstreamProcess = {
  processId: "plugin-workstream";
  workspaceRef: "plugin://workstream";
  ledgerUrl: string;
  ledgerName: string;
};

type WorkstreamRole = {
  roleId: "workstream-frame";
  capability: "streams";
};

const bindingContext = {
  process: {
    processId: "plugin-workstream",
    workspaceRef: "plugin://workstream",
    ledgerUrl: DEFAULT_LEDGER_URL,
    ledgerName: DEFAULT_LEDGER_NAME,
  },
  role: {
    roleId: "workstream-frame",
    capability: "streams",
  },
} satisfies ServiceBindingContext<WorkstreamProcess, WorkstreamRole>;

const workstreamService = bindService(createClient, {
  bindingId: "plugin-workstream/workstream-frame",
  deps: (context) => ({
    ledger: createFlureeHttpSemanticLedgerPort({ baseUrl: context.process.ledgerUrl }),
    clock: { now: () => new Date().toISOString() },
    logger: createEmbeddedPlaceholderLoggerAdapter(),
    analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
  }),
  scope: (context) => ({
    ledgerName: context.process.ledgerName,
  }),
  config: { readOnly: false },
  cacheKey: (context) =>
    `${context.process.processId}:${context.process.ledgerUrl}:${context.process.ledgerName}`,
} satisfies ServiceBinding<CreateClientOptions, WorkstreamProcess, WorkstreamRole>);

/** Resolved CLI settings for one invocation. */
export interface WorkstreamClientOptions {
  ledgerUrl?: string;
  ledgerName?: string;
}

/**
 * Resolve the service client for one command invocation.
 *
 * @param options - Flag-supplied overrides; environment and defaults fill gaps.
 */
export async function createWorkstreamClient(
  options: WorkstreamClientOptions = {}
): Promise<WorkstreamClient> {
  return workstreamService.resolve({
    ...bindingContext,
    process: {
      ...bindingContext.process,
      ledgerUrl: options.ledgerUrl ?? process.env.FLUREE_URL ?? DEFAULT_LEDGER_URL,
      ledgerName: options.ledgerName ?? process.env.WORKSTREAM_LEDGER ?? DEFAULT_LEDGER_NAME,
    },
  });
}

/** Per-call invocation context every procedure requires. */
export function invocation(traceId: string): { context: { invocation: { traceId: string } } } {
  return { context: { invocation: { traceId } } };
}
