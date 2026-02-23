import { describe, expect, it, vi } from "vitest";
import { registerServer } from "../src/server";
import { mount } from "../src/web";

describe("@rawr/plugin-mfe-demo", () => {
  it("registers support-triage example routes", () => {
    const routes = new Map<string, () => unknown>();
    const app = {
      get(path: string, handler: () => unknown) {
        routes.set(path, handler);
      },
    };

    registerServer(app, { baseUrl: "/" });
    expect(routes.has("/mfe-demo/health")).toBe(true);
    expect(routes.has("/mfe-demo/support-triage/status")).toBe(true);

    const status = routes.get("/mfe-demo/support-triage/status");
    expect(status).toBeDefined();
    expect(status?.()).toMatchObject({
      capability: "support-triage",
      exampleDomain: true,
      routeHints: {
        publishedBoundary: {
          triggerRun: "POST /api/workflows/support-triage/runs",
          getStatus: "GET /api/workflows/support-triage/status?runId=...",
        },
      },
    });
  });

  it("mounts support-triage UI state and unmounts from the DOM", async () => {
    vi.useFakeTimers();

    const now = new Date("2026-02-23T00:00:00.000Z").toISOString();
    const runId = "support-triage-123-test";
    let runStatusCalls = 0;

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = (init?.method ?? "GET").toUpperCase();
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;

      if (method === "GET" && url.includes("/api/workflows/support-triage/status") && !url.includes("runId=")) {
        return new Response(JSON.stringify({ capability: "support-triage", healthy: true, run: null }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (method === "POST" && url.includes("/api/workflows/support-triage/runs")) {
        return new Response(
          JSON.stringify({
            accepted: true,
            run: {
              runId,
              queueId: "queue-demo",
              requestedBy: "mfe-demo",
              dryRun: true,
              status: "queued",
              startedAt: now,
            },
            eventIds: ["evt_123"],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      if (method === "GET" && url.includes(`/api/workflows/support-triage/status?runId=${runId}`)) {
        runStatusCalls += 1;
        const status = runStatusCalls <= 1 ? "running" : "completed";
        return new Response(
          JSON.stringify({
            capability: "support-triage",
            healthy: true,
            run: {
              runId,
              queueId: "queue-demo",
              requestedBy: "mfe-demo",
              dryRun: true,
              status,
              startedAt: now,
              ...(status === "completed" ? { finishedAt: now, triagedTicketCount: 12, escalatedTicketCount: 3 } : {}),
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      return new Response("not found", { status: 404 });
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const flush = async (count = 12) => {
      for (let i = 0; i < count; i += 1) await Promise.resolve();
    };

    const el = document.createElement("div");
    const handle = mount(el, {
      hostAppId: "test-host",
      basePath: "/",
      getLocation: () => ({ pathname: "/", search: "", hash: "" }),
      navigate: () => undefined,
    });

    expect(el.textContent).toContain("Support triage example micro-frontend");
    expect(el.textContent).toContain("status: idle");

    await flush();
    expect(el.textContent).toContain("healthy: true");

    const triggerButton = Array.from(el.querySelectorAll("button")).find((button) => button.textContent === "Trigger Workflow Run");
    expect(triggerButton).toBeDefined();
    triggerButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    await flush();
    expect(el.textContent).toContain(`runId: ${runId}`);
    expect(el.textContent).toContain("polling: on");

    await flush();
    expect(el.textContent).toContain("status: running");

    await vi.advanceTimersByTimeAsync(1500);
    await flush();
    expect(el.textContent).toContain("status: completed");
    expect(el.textContent).toContain("polling: off");
    expect(el.textContent).toContain("triagedTicketCount: 12");

    handle?.unmount?.();
    expect(el.textContent).toBe("");

    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });
});
