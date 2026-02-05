import fs from "node:fs/promises";
import path from "node:path";
import type { AnyElysia } from "./plugins";

export type RawrRoutesOptions = {
  repoRoot: string;
  enabledPluginIds: ReadonlySet<string>;
};

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
  app.get("/rawr/state", () => ({ ok: true, plugins: { enabled: Array.from(opts.enabledPluginIds).sort() } }));

  app.get("/rawr/plugins/web/:dirName", async ({ params }) => {
    const dirName = String((params as any).dirName ?? "");
    if (!isSafeDirName(dirName)) return new Response("not found", { status: 404 });

    const pluginRoot = path.join(opts.repoRoot, "plugins", dirName);
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

  return app;
}
