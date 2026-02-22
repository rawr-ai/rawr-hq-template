import fs from "node:fs/promises";
import path from "node:path";

import type { AnyElysia } from "./plugins";
import { createCoordinationInngestFunction, createInngestServeHandler } from "@rawr/coordination-inngest";
import { createCoordinationRuntimeAdapter } from "./coordination";
import { registerOrpcRoutes } from "./orpc";
import { createWorkflowBoundaryContext, type RawrBoundaryContextDeps } from "./workflows/context";

export type RawrRoutesOptions = {
  repoRoot: string;
  enabledPluginIds: ReadonlySet<string>;
  baseUrl?: string;
};

export const PHASE_A_HOST_MOUNT_ORDER = ["/api/inngest", "/api/workflows/*", "/rpc + /api/orpc/*"] as const;

const INNGEST_SIGNATURE_HEADERS = ["x-inngest-signature", "inngest-signature"] as const;

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

function hasConfiguredIngressSigningKey(): boolean {
  const signingKey = process.env.INNGEST_SIGNING_KEY;
  return typeof signingKey === "string" && signingKey.trim() !== "";
}

function hasIngressSignatureHeader(request: Request): boolean {
  for (const header of INNGEST_SIGNATURE_HEADERS) {
    const value = request.headers.get(header);
    if (typeof value === "string" && value.trim() !== "") {
      return true;
    }
  }
  return false;
}

export function verifyInngestIngressRequest(request: Request): boolean {
  return hasConfiguredIngressSigningKey() && hasIngressSignatureHeader(request);
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
  const inngestBundle = createCoordinationInngestFunction({ runtime });
  const inngestHandler = createInngestServeHandler({
    client: inngestBundle.client,
    functions: inngestBundle.functions,
  });
  const boundaryContextDeps: RawrBoundaryContextDeps = {
    repoRoot: opts.repoRoot,
    baseUrl: opts.baseUrl ?? "http://localhost:3000",
    runtime,
    inngestClient: inngestBundle.client,
  };

  app.all(
    "/api/inngest",
    async ({ request }) => {
      const req = request as Request;
      if (!verifyInngestIngressRequest(req)) {
        return new Response("forbidden", { status: 403 });
      }
      return inngestHandler(req);
    },
    { parse: "none" },
  );

  app.all(
    "/api/workflows/*",
    async ({ request }) => {
      void createWorkflowBoundaryContext(request as Request, boundaryContextDeps);
      return new Response("not found", { status: 404 });
    },
    { parse: "none" },
  );

  registerOrpcRoutes(app, boundaryContextDeps);

  return app;
}
