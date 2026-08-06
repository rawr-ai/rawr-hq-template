import { createHmac, timingSafeEqual } from "node:crypto";
import fsSync from "node:fs";
import path from "node:path";
import { Inngest } from "inngest";
import { serve as inngestServe } from "inngest/bun";
import type { RawrServerApp } from "./app";
import type { RawrHostComposition } from "./host-composition";
import { registerOrpcRoutes } from "./orpc";
import { createRequestScopedBoundaryContext, type RawrInitialContext } from "./request-context";
import type { ServerTelemetryLifecycle } from "./telemetry";
import { createWorkflowRouteHarness } from "./workflows/harness";
import { createRawrWorkflowRuntime } from "./workflows/runtime";

export type RawrRoutesOptions = {
  repoRoot: string;
  hostComposition: RawrHostComposition;
  inngestClient: Inngest;
  telemetry: ServerTelemetryLifecycle;
  baseUrl?: string;
};

export const PHASE_A_HOST_MOUNT_ORDER = [
  "/api/inngest",
  "/api/workflows/<capability>/*",
  "/rpc + /api/orpc/*",
] as const;

type HostWorkflowRuntimeInput = Parameters<
  RawrHostComposition["realization"]["workflows"]["createInngestFunctions"]
>[0];

export type HostInngestBundle = Readonly<{
  client: Inngest;
  runtime: HostWorkflowRuntimeInput["runtime"];
  functions: readonly unknown[];
  handler: ReturnType<typeof inngestServe>;
}>;

/** Constructs the server process's sole native Inngest client. */
export function createHostInngestClient(): Inngest {
  return new Inngest({ id: "rawr-hq" });
}

const INNGEST_SIGNATURE_HEADERS = ["x-inngest-signature", "inngest-signature"] as const;
const INNGEST_SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000;
type ParsedInngestSignature = Readonly<{
  timestampSeconds: number;
  signature: string;
}>;

function configuredIngressSigningKeys(): string[] {
  const signingKey = process.env.INNGEST_SIGNING_KEY?.trim() ?? "";
  const fallback = process.env.INNGEST_SIGNING_KEY_FALLBACK?.trim() ?? "";

  const keys = [signingKey, fallback].filter((value) => value !== "");
  return [...new Set(keys)];
}

function ingressSignatureHeader(request: Request): string | null {
  for (const header of INNGEST_SIGNATURE_HEADERS) {
    const value = request.headers.get(header);
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }
  return null;
}

function parseIngressSignature(value: string): ParsedInngestSignature | null {
  const params = new URLSearchParams(value);
  const timestampRaw = params.get("t");
  const signature = params.get("s");
  if (!timestampRaw || !signature) return null;

  const timestampSeconds = Number.parseInt(timestampRaw, 10);
  if (!Number.isFinite(timestampSeconds) || timestampSeconds <= 0) return null;

  const normalizedSignature = signature.trim().toLowerCase();
  if (normalizedSignature === "") return null;

  return {
    timestampSeconds,
    signature: normalizedSignature,
  };
}

function isExpiredIngressSignature(timestampSeconds: number): boolean {
  const signedAtMs = timestampSeconds * 1000;
  return Date.now() - signedAtMs > INNGEST_SIGNATURE_MAX_AGE_MS;
}

function normalizeSigningKey(signingKey: string): string {
  return signingKey.replace(/signkey-\w+-/u, "");
}

function signIngressPayload(body: string, timestampSeconds: number, signingKey: string): string {
  return createHmac("sha256", normalizeSigningKey(signingKey))
    .update(body)
    .update(String(timestampSeconds))
    .digest("hex");
}

function signaturesMatch(expected: string, actual: string): boolean {
  const expectedHex = Buffer.from(expected, "hex");
  const actualHex = Buffer.from(actual, "hex");
  if (
    expectedHex.length === 0 ||
    actualHex.length === 0 ||
    expectedHex.length !== actualHex.length
  ) {
    return false;
  }
  return timingSafeEqual(expectedHex, actualHex);
}

function shouldAllowUnsignedInngestIngress(): boolean {
  // In explicit dev mode, allow local Inngest Dev Server to sync/execute without signature headers.
  // Production remains strict and always requires a valid signature.
  if ((process.env.INNGEST_DEV ?? "").trim() !== "") return true;

  const nodeEnv = (process.env.NODE_ENV ?? "").trim();
  const eventKey = (process.env.INNGEST_EVENT_KEY ?? "").trim();
  return nodeEnv !== "production" && eventKey === "local";
}

export async function verifyInngestIngressRequest(request: Request): Promise<boolean> {
  const signatureHeader = ingressSignatureHeader(request);
  if (!signatureHeader) {
    return shouldAllowUnsignedInngestIngress();
  }

  const signingKeys = configuredIngressSigningKeys();
  if (signingKeys.length === 0) return false;

  const signature = parseIngressSignature(signatureHeader);
  if (!signature || isExpiredIngressSignature(signature.timestampSeconds)) return false;

  const requestBody = await request.clone().text();
  for (const key of signingKeys) {
    const expectedSignature = signIngressPayload(requestBody, signature.timestampSeconds, key);
    if (signaturesMatch(expectedSignature, signature.signature)) {
      return true;
    }
  }
  return false;
}

function resolveAuthorityRepoRoot(repoRoot: string): string {
  const resolvedRoot = path.resolve(repoRoot);
  try {
    return fsSync.realpathSync(resolvedRoot);
  } catch {
    return resolvedRoot;
  }
}

/**
 * @agents-style seam-law declaration -> host binding -> request/process materialization
 * @agents-canonical host-owned process materialization entrypoint
 * @agents-must-not manifest-side executable bridge restoration
 *
 * Owns:
 * - process-scoped Inngest client/runtime creation for the server role
 * - materializing workflow durable functions from the server-owned host composition
 *
 * Must not own:
 * - plugin declaration selection
 * - host satisfier construction outside the canonical host composition
 * - alternate executable composition entrypoints
 */
export function createHostInngestBundle(input: {
  client: Inngest;
  repoRoot: string;
  hostComposition: RawrHostComposition;
}): HostInngestBundle {
  const client = input.client;
  const runtime = createRawrWorkflowRuntime({
    repoRoot: input.repoRoot,
  });
  // The app manifest owns which registrations exist. The host binds them into
  // an executable role plan, then materializes runtime surfaces explicitly.
  const functions = input.hostComposition.realization.workflows.createInngestFunctions({
    client,
    runtime,
  });
  const handler = inngestServe({
    client,
    functions: functions as any,
  });

  return {
    client,
    runtime,
    functions,
    handler,
  };
}

/**
 * @agents-style seam-law declaration -> host binding -> request/process materialization
 * @agents-canonical server-role route mount entrypoint
 * @agents-must-not manifest-shaped runtime factory authority
 *
 * Owns:
 * - process mount order for Inngest, workflow, and oRPC surfaces
 * - routing host-composed realization outputs onto the live Elysia app
 *
 * Must not own:
 * - capability-local client construction in the manifest
 * - request/process materialization outside host-owned server surfaces
 * - process restart authority
 */
export function registerRawrRoutes<TApp extends RawrServerApp>(
  app: TApp,
  opts: RawrRoutesOptions
): TApp {
  const authorityRepoRoot = resolveAuthorityRepoRoot(opts.repoRoot);
  const rawrHostSeam = opts.hostComposition.realization;

  const hostInngest = createHostInngestBundle({
    client: opts.inngestClient,
    repoRoot: authorityRepoRoot,
    hostComposition: opts.hostComposition,
  });
  const initialContext: RawrInitialContext = {
    ...opts.telemetry.effectContext,
    deps: {
      runtime: hostInngest.runtime,
      inngestClient: hostInngest.client,
      exampleTodo: opts.hostComposition.satisfiers.exampleTodo,
    },
    scope: {
      repoRoot: authorityRepoRoot,
    },
    config: {
      baseUrl: opts.baseUrl ?? "http://localhost:3000",
    },
  };
  const workflowRoutes = createWorkflowRouteHarness({
    workflows: {
      publishedRouter: rawrHostSeam.workflows.published.router,
    },
    contextFactory: createRequestScopedBoundaryContext,
    hostLogger: opts.hostComposition.hostLogger,
  });

  app.all(
    "/api/inngest",
    async ({ request }) => {
      const req = request as Request;
      if (!(await verifyInngestIngressRequest(req))) {
        return new Response("forbidden", { status: 403 });
      }
      return hostInngest.handler(req);
    },
    { parse: "none" }
  );

  app.all(
    "/api/workflows/*",
    async ({ request }) => {
      return workflowRoutes.handle(request as Request, initialContext);
    },
    { parse: "none" }
  );

  registerOrpcRoutes(app, {
    ...initialContext,
    ...(opts.telemetry.telemetry.availability === "disabled"
      ? {}
      : { evlogDrain: opts.telemetry.evlogDrain }),
    router: rawrHostSeam.orpc.router,
    openApiRouter: rawrHostSeam.orpc.published.router,
    contextFactory: (request, deps) => createRequestScopedBoundaryContext(request, deps),
  });

  return app;
}
