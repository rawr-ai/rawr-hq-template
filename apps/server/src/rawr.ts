import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Inngest } from "inngest";
import { serve as inngestServe } from "inngest/bun";
import { createRawrHqManifest } from "../../../rawr.hq";
import { materializeRawrHostBoundRolePlan } from "./host-realization";
import { createRawrHostBoundRolePlan } from "./host-seam";
import { createRawrHostSatisfiers } from "./host-satisfiers";
import { createHostLoggerAdapter } from "./logging";
import type { AnyElysia } from "./plugins";
import { registerOrpcRoutes } from "./orpc";
import {
  createRequestScopedBoundaryContext,
  createWorkflowBoundaryContext,
  type RawrBoundaryContextDeps,
} from "./workflows/context";
import { createWorkflowRouteHarness } from "./workflows/harness";
import { createRawrWorkflowRuntime } from "./workflows/runtime";

export type RawrRoutesOptions = {
  repoRoot: string;
  enabledPluginIds: ReadonlySet<string>;
  baseUrl?: string;
};

export const PHASE_A_HOST_MOUNT_ORDER = ["/api/inngest", "/api/workflows/<capability>/*", "/rpc + /api/orpc/*"] as const;

const rawrHqManifest = createRawrHqManifest();
const rawrHostSatisfiers = createRawrHostSatisfiers({
  hostLogger: createHostLoggerAdapter(),
});
const rawrHqBoundRolePlan = createRawrHostBoundRolePlan({
  manifest: rawrHqManifest,
  satisfiers: rawrHostSatisfiers,
});

type HostWorkflowRuntimeInput = Parameters<
  ReturnType<typeof materializeRawrHostBoundRolePlan>["workflows"]["createInngestFunctions"]
>[0];

export type HostInngestBundle = Readonly<{
  client: HostWorkflowRuntimeInput["client"];
  runtime: HostWorkflowRuntimeInput["runtime"];
  functions: readonly unknown[];
  handler: ReturnType<typeof inngestServe>;
}>;

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
  return createHmac("sha256", normalizeSigningKey(signingKey)).update(body).update(String(timestampSeconds)).digest("hex");
}

function signaturesMatch(expected: string, actual: string): boolean {
  const expectedHex = Buffer.from(expected, "hex");
  const actualHex = Buffer.from(actual, "hex");
  if (expectedHex.length === 0 || actualHex.length === 0 || expectedHex.length !== actualHex.length) {
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

function isSafeDirName(input: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/.test(input);
}

async function readPluginId(pluginRoot: string, dirName: string): Promise<string> {
  try {
    const raw = await fs.readFile(path.join(pluginRoot, "package.json"), "utf8");
    const parsed = JSON.parse(raw) as { name?: unknown };
    return typeof parsed.name === "string" ? parsed.name : dirName;
  } catch {
    return dirName;
  }
}

async function resolveWebModulePath(pluginRoot: string): Promise<string | null> {
  const candidates = [
    path.join(pluginRoot, "dist", "web.js"),
    path.join(pluginRoot, "dist", "src", "web.js"),
    path.join(pluginRoot, "dist", "web", "index.js"),
    path.join(pluginRoot, "dist", "src", "web", "index.js"),
  ];

  for (const p of candidates) {
    try {
      const st = await fs.stat(p);
      if (st.isFile()) return p;
    } catch {
      // ignore
    }
  }
  return null;
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
 * - materializing workflow durable functions from the already-bound host plan
 *
 * Must not own:
 * - plugin declaration selection
 * - host satisfier construction outside the canonical host seam
 * - alternate composition input authority through `rawr.hq.ts`
 */
export function createHostInngestBundle(input: { repoRoot: string }): HostInngestBundle {
  const rawrHqHostSeam = materializeRawrHostBoundRolePlan(rawrHqBoundRolePlan);
  const client = new Inngest({ id: "rawr-hq" });
  const runtime = createRawrWorkflowRuntime({
    repoRoot: input.repoRoot,
  });
  // The app manifest owns which registrations exist. The host binds them into
  // an executable role plan, then materializes runtime surfaces explicitly.
  const functions = rawrHqHostSeam.workflows.createInngestFunctions({
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
 * - routing host-owned realization outputs onto the live Elysia app
 *
 * Must not own:
 * - capability-local client construction in the manifest
 * - request/process materialization outside host-owned server surfaces
 * - restart authority through `rawr.hq.ts`
 */
export function registerRawrRoutes<TApp extends AnyElysia>(app: TApp, opts: RawrRoutesOptions): TApp {
  const authorityRepoRoot = resolveAuthorityRepoRoot(opts.repoRoot);
  const hostLogger = createHostLoggerAdapter();
  const rawrHqHostSeam = materializeRawrHostBoundRolePlan(rawrHqBoundRolePlan);

  app.get("/rawr/plugins/web/:dirName", async ({ params }) => {
    const dirName =
      typeof params === "object" &&
      params !== null &&
      "dirName" in params &&
      typeof (params as { dirName?: unknown }).dirName === "string"
        ? (params as { dirName: string }).dirName
        : "";
    if (!isSafeDirName(dirName)) return new Response("not found", { status: 404 });

    const pluginRoot = path.join(authorityRepoRoot, "plugins", "web", dirName);
    try {
      const st = await fs.stat(pluginRoot);
      if (!st.isDirectory()) return new Response("not found", { status: 404 });
    } catch {
      return new Response("not found", { status: 404 });
    }
    const pluginId = await readPluginId(pluginRoot, dirName);
    if (!opts.enabledPluginIds.has(pluginId) && !opts.enabledPluginIds.has(dirName)) {
      return new Response("not found", { status: 404 });
    }

    const webModulePath = await resolveWebModulePath(pluginRoot);
    if (!webModulePath) return new Response("not found", { status: 404 });

    try {
      const raw = await fs.readFile(webModulePath, "utf8");
      return new Response(raw, {
        status: 200,
        headers: {
          "content-type": "text/javascript; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    } catch {
      return new Response("not found", { status: 404 });
    }
  });

  const hostInngest = createHostInngestBundle({
    repoRoot: authorityRepoRoot,
  });
  const boundaryContextDeps: RawrBoundaryContextDeps = {
    repoRoot: authorityRepoRoot,
    baseUrl: opts.baseUrl ?? "http://localhost:3000",
    runtime: hostInngest.runtime,
    inngestClient: hostInngest.client,
    hostLogger,
  };
  const workflowRoutes = createWorkflowRouteHarness({
    workflows: {
      publishedRouter: rawrHqHostSeam.workflows.published.router,
    },
    contextFactory: (request, deps) => createWorkflowBoundaryContext(request, deps),
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
    { parse: "none" },
  );

  app.all(
    "/api/workflows/*",
    async ({ request }) => {
      return workflowRoutes.handle(request as Request, boundaryContextDeps);
    },
    { parse: "none" },
  );

  registerOrpcRoutes(app, {
    ...boundaryContextDeps,
    router: rawrHqHostSeam.orpc.router,
    openApiRouter: rawrHqHostSeam.orpc.published.router,
    contextFactory: (request, deps) => createRequestScopedBoundaryContext(request, deps),
  });

  return app;
}
