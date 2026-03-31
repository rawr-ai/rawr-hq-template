import type { MountContext } from "@rawr/ui-sdk";

type DemoStatusBody = Readonly<{
  ok?: boolean;
  plugin?: string;
  capability?: string;
  demo?: boolean;
  mode?: string;
  timestamp?: string;
  routeHints?: Readonly<Record<string, unknown>>;
}>;

function normalizeBasePath(basePath: string | undefined): string {
  const raw = (basePath ?? "").trim();
  if (raw === "" || raw === "/") return "";
  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withLeadingSlash.replace(/\/+$/u, "");
}

function resolveStatusUrl(basePath: string): string {
  const path = `${basePath}/mfe-demo/status`;
  if (typeof window !== "undefined") {
    return new URL(path, window.location.href).toString();
  }
  return `http://localhost:3000${path}`;
}

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function normalizeBody(value: unknown): DemoStatusBody {
  if (!value || typeof value !== "object") return {};
  if ("json" in value && value.json && typeof value.json === "object") {
    return value.json as DemoStatusBody;
  }
  return value as DemoStatusBody;
}

export function mount(el: HTMLElement, ctx: MountContext) {
  const basePath = normalizeBasePath(ctx.basePath);

  const root = document.createElement("div");
  root.style.fontFamily = "ui-sans-serif, system-ui";
  root.style.fontSize = "14px";
  root.style.lineHeight = "1.4";
  root.style.padding = "12px";
  root.style.border = "1px solid rgba(15, 23, 42, 0.18)";
  root.style.borderRadius = "10px";

  const title = document.createElement("div");
  title.style.fontWeight = "700";
  title.textContent = "Generic micro-frontend demo";

  const hint = document.createElement("div");
  hint.style.marginTop = "4px";
  hint.style.color = "rgba(15, 23, 42, 0.7)";
  hint.textContent = "Example-only plugin surface that fetches its own first-party status route.";

  const refreshBtn = document.createElement("button");
  refreshBtn.type = "button";
  refreshBtn.textContent = "Refresh demo status";
  refreshBtn.style.marginTop = "10px";

  const state = document.createElement("div");
  state.style.marginTop = "10px";
  state.style.display = "grid";
  state.style.gap = "4px";

  const statusEl = document.createElement("div");
  const modeEl = document.createElement("div");
  const capabilityEl = document.createElement("div");
  const pluginEl = document.createElement("div");
  const errorEl = document.createElement("div");
  errorEl.style.whiteSpace = "pre-wrap";

  state.append(statusEl, modeEl, capabilityEl, pluginEl, errorEl);

  const statusPre = document.createElement("pre");
  statusPre.style.margin = "10px 0 0";
  statusPre.style.padding = "8px";
  statusPre.style.border = "1px solid rgba(15, 23, 42, 0.12)";
  statusPre.style.borderRadius = "8px";
  statusPre.style.overflowX = "auto";
  statusPre.style.fontSize = "12px";

  root.append(title, hint, refreshBtn, state, statusPre);
  el.appendChild(root);

  let loading = true;
  let body: DemoStatusBody | null = null;
  let lastError: string | null = null;
  let disposed = false;

  function render() {
    const status = loading ? "loading" : lastError ? "error" : "ready";
    statusEl.textContent = `status: ${status}`;
    modeEl.textContent = `mode: ${body?.mode ?? (body?.demo ? "demo" : "unknown")}`;
    capabilityEl.textContent = `capability: ${body?.capability ?? "unknown"}`;
    pluginEl.textContent = `plugin: ${body?.plugin ?? name}`;
    errorEl.textContent = `error: ${lastError ?? "none"}`;
    statusPre.textContent = `last status:\n${body ? prettyJson(body) : "(none)"}`;
  }

  async function refresh() {
    loading = true;
    lastError = null;
    render();

    try {
      const response = await fetch(resolveStatusUrl(basePath), {
        headers: { accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`status request failed with ${response.status}`);
      }

      const raw = (await response.json()) as unknown;
      body = normalizeBody(raw);
    } catch (err) {
      body = null;
      lastError = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
      if (!disposed) render();
    }
  }

  refreshBtn.addEventListener("click", () => {
    void refresh();
  });

  render();
  void refresh();

  return {
    unmount: () => {
      disposed = true;
      root.remove();
    },
  };
}

export const name = "@rawr/plugin-mfe-demo";
