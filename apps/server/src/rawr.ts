import fs from "node:fs/promises";
import path from "node:path";
import { createHmac, timingSafeEqual } from "node:crypto";

import { rawrHqManifest } from "../../../rawr.hq";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import type { AnyElysia } from "./plugins";
import { createCoordinationRuntimeAdapter } from "./coordination";
import { registerOrpcRoutes } from "./orpc";
import { createWorkflowBoundaryContext, type RawrBoundaryContextDeps } from "./workflows/context";

export type RawrRoutesOptions = {
  repoRoot: string;
  enabledPluginIds: ReadonlySet<string>;
  baseUrl?: string;
};

export const PHASE_A_HOST_MOUNT_ORDER = ["/api/inngest", "/api/workflows/<capability>/*", "/rpc + /api/orpc/*"] as const;

const INNGEST_SIGNATURE_HEADERS = ["x-inngest-signature", "inngest-signature"] as const;
const INNGEST_SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000;
const WORKFLOW_BASE_PATH = "/api/workflows";
const WORKFLOW_CAPABILITY_PATHS = Object.entries(rawrHqManifest.workflows.capabilities).map(([capability, manifest]) => ({
  capability,
  pathPrefix: normalizeWorkflowPathPrefix(manifest.pathPrefix),
}));
type ParsedInngestSignature = Readonly<{
  timestampSeconds: number;
  signature: string;
}>;

function asUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    return parsed.href;
  } catch {
    return undefined;
  }
}

function resolveInngestBaseUrl(): string {
  return (
    asUrl(process.env.INNGEST_BASE_URL) ??
    asUrl(process.env.INNGEST_EVENT_API_BASE_URL) ??
    asUrl(process.env.INNGEST_DEV) ??
    "http://localhost:8288"
  );
}

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

export async function verifyInngestIngressRequest(request: Request): Promise<boolean> {
  const signingKeys = configuredIngressSigningKeys();
  if (signingKeys.length === 0) return false;

  const signatureHeader = ingressSignatureHeader(request);
  if (!signatureHeader) return false;

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

function normalizeWorkflowPathPrefix(pathPrefix: string): string {
  const withLeadingSlash = pathPrefix.startsWith("/") ? pathPrefix : `/${pathPrefix}`;
  const withoutTrailingSlash = withLeadingSlash.replace(/\/+$/u, "");
  return withoutTrailingSlash === "" ? "/" : withoutTrailingSlash;
}

function resolveWorkflowCapability(pathname: string): string | null {
  if (!pathname.startsWith(`${WORKFLOW_BASE_PATH}/`)) return null;
  const workflowPathname = pathname.slice(WORKFLOW_BASE_PATH.length);
  for (const entry of WORKFLOW_CAPABILITY_PATHS) {
    if (workflowPathname === entry.pathPrefix || workflowPathname.startsWith(`${entry.pathPrefix}/`)) {
      return entry.capability;
    }
  }
  return null;
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

export function registerRawrRoutes<TApp extends AnyElysia>(app: TApp, opts: RawrRoutesOptions): TApp {
  app.get("/rawr/plugins/web/:dirName", async ({ params }) => {
    const dirName = String((params as any).dirName ?? "");
    if (!isSafeDirName(dirName)) return new Response("not found", { status: 404 });

    const pluginRoot = path.join(opts.repoRoot, "plugins", "web", dirName);
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

  const runtime = createCoordinationRuntimeAdapter({
    repoRoot: opts.repoRoot,
    inngestBaseUrl: resolveInngestBaseUrl(),
  });
  const inngestBundle = rawrHqManifest.inngest.bundleFactory(runtime);
  const inngestHandler = rawrHqManifest.inngest.serveHandlerFactory(inngestBundle);
  const boundaryContextDeps: RawrBoundaryContextDeps = {
    repoRoot: opts.repoRoot,
    baseUrl: opts.baseUrl ?? "http://localhost:3000",
    runtime,
    inngestClient: inngestBundle.client,
  };
  const workflowOpenApiHandler = new OpenAPIHandler(rawrHqManifest.workflows.triggerRouter);

  app.all(
    "/api/inngest",
    async ({ request }) => {
      const req = request as Request;
      if (!(await verifyInngestIngressRequest(req))) {
        return new Response("forbidden", { status: 403 });
      }
      return inngestHandler(req);
    },
    { parse: "none" },
  );

  app.all(
    "/api/workflows/*",
    async ({ request }) => {
      const req = request as Request;
      const capability = resolveWorkflowCapability(new URL(req.url).pathname);
      if (!capability) {
        return new Response("not found", { status: 404 });
      }

      const context = createWorkflowBoundaryContext(req, boundaryContextDeps);
      const result = await workflowOpenApiHandler.handle(req, {
        prefix: WORKFLOW_BASE_PATH,
        context,
      });
      return result.matched ? result.response : new Response("not found", { status: 404 });
    },
    { parse: "none" },
  );

  registerOrpcRoutes(app, {
    ...boundaryContextDeps,
    router: rawrHqManifest.orpc.router,
  });

  return app;
}
