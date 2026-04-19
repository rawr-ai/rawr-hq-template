import { describe, expect, it, vi } from "vitest";
import { registerServer } from "../src/server";
import { mount } from "../src/web";

describe("@rawr/plugin-mfe-demo", () => {
  it("registers generic demo routes", () => {
    const routes = new Map<string, () => unknown>();
    const app = {
      get(path: string, handler: () => unknown) {
        routes.set(path, handler);
      },
    };

    registerServer(app, { baseUrl: "/" });
    expect(routes.has("/mfe-demo/health")).toBe(true);
    expect(routes.has("/mfe-demo/status")).toBe(true);

    const status = routes.get("/mfe-demo/status");
    expect(status).toBeDefined();
    expect(status?.()).toMatchObject({
      capability: "demo-plugin",
      demo: true,
      routeHints: {
        firstPartyDefault: {
          transport: "RPCLink",
          status: "POST /rpc/state/getRuntimeState",
          publication: "GET /api/orpc/exampleTodo/tasks/{id}",
        },
      },
    });
  });

  it("mounts demo UI state and unmounts from the DOM", async () => {
    vi.useFakeTimers();

    const now = new Date("2026-02-23T00:00:00.000Z").toISOString();
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ json: { ok: true, mode: "demo", timestamp: now } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const flush = async (count = 24) => {
      for (let i = 0; i < count; i += 1) await Promise.resolve();
    };

    const settleFakeAsyncWork = async () => {
      await flush();
      await vi.advanceTimersByTimeAsync(0);
      await flush();
    };

    const el = document.createElement("div");
    const handle = mount(el, {
      hostAppId: "test-host",
      basePath: "/",
      getLocation: () => ({ pathname: "/", search: "", hash: "" }),
      navigate: () => undefined,
    });

    expect(el.textContent).toContain("Generic micro-frontend demo");
    expect(el.textContent).toContain("status: loading");

    await settleFakeAsyncWork();
    expect(el.textContent).toContain("status: ready");
    expect(el.textContent).toContain("mode: demo");

    handle?.unmount?.();
    expect(el.textContent).toBe("");

    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });
});
