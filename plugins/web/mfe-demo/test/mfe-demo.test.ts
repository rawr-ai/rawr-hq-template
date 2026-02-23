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
        firstPartyDefault: {
          transport: "RPCLink",
          triggerRun: "POST /rpc (procedure: triggerSupportTriage)",
          getStatus: "POST /rpc (procedure: getSupportTriageStatus; optional: { runId })",
        },
      },
    });
  });

  it("mounts support-triage UI state and unmounts from the DOM", async () => {
    const now = new Date("2026-02-23T00:00:00.000Z").toISOString();
    const runId = "support-triage-123-test";
    let runStatusCalls = 0;

    async function readRequestBodyText(body: RequestInit["body"]): Promise<string> {
      if (typeof body === "string") return body;
      if (!body) return "";

      try {
        return await new Response(body).text();
      } catch {
        return "";
      }
    }

    function parseRequestUrl(input: string): URL | null {
      try {
        return new URL(input);
      } catch {
        try {
          return new URL(input, "http://localhost");
        } catch {
          return null;
        }
      }
    }

    function safeJsonParse(value: string): unknown {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }

    function isRecord(value: unknown): value is Record<string, unknown> {
      return typeof value === "object" && value !== null;
    }

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : null;
      const method = (request?.method ?? init?.method ?? "GET").toUpperCase();
      const urlText = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
      const url = parseRequestUrl(urlText);
      const pathname = url?.pathname ?? urlText;

      // RPCLink calls `/rpc/<procedure>` (e.g. `/rpc/getSupportTriageStatus`) and
      // expects the response to be a StandardRPC envelope: `{ json: <payload> }`.
      const pathParts = pathname.split("/").filter(Boolean);
      if (pathParts[0] !== "rpc") return new Response("not found", { status: 404 });
      const procedure = pathParts.slice(1).join("/");
      if (!procedure) return new Response("not found", { status: 404 });

      const dataText =
        method === "GET"
          ? (url?.searchParams.get("data") ?? "")
          : request
            ? await request.clone().text()
            : await readRequestBodyText(init?.body);

      const envelope = safeJsonParse(dataText);
      const inputJson = isRecord(envelope) && isRecord(envelope.json) ? envelope.json : {};

      if (procedure === "triggerSupportTriage") {
        return new Response(
          JSON.stringify({
            json: {
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
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      if (procedure === "getSupportTriageStatus") {
        const requestedRunId = typeof inputJson.runId === "string" ? inputJson.runId : null;

        if (!requestedRunId) {
          return new Response(JSON.stringify({ json: { capability: "support-triage", healthy: true, run: null } }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }

        runStatusCalls += 1;
        const status = runStatusCalls <= 1 ? "running" : "completed";
        return new Response(
          JSON.stringify({
            json: {
              capability: "support-triage",
              healthy: true,
              run: {
                runId: requestedRunId,
                queueId: "queue-demo",
                requestedBy: "mfe-demo",
                dryRun: true,
                status,
                startedAt: now,
                ...(status === "completed"
                  ? { finishedAt: now, triagedTicketCount: 12, escalatedTicketCount: 3 }
                  : {}),
              },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      return new Response("not found", { status: 404 });
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const flush = async (count = 24) => {
      for (let i = 0; i < count; i += 1) await Promise.resolve();
    };

    const settleRealAsyncWork = async () => {
      await flush();
      // RPCLink's fetch + Response parsing can land on a macrotask turn.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      await flush();
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

    expect(el.textContent).toContain("Support triage example micro-frontend");
    expect(el.textContent).toContain("status: idle");

    await settleRealAsyncWork();
    expect(el.textContent).toContain("healthy: true");

    // Enable fake timers only for the polling interval portion; keep the initial RPCLink
    // call on real timers so fetch/Response body parsing isn't impacted by timer mocking.
    vi.useFakeTimers();

    const triggerButton = Array.from(el.querySelectorAll("button")).find((button) => button.textContent === "Trigger Workflow Run");
    expect(triggerButton).toBeDefined();
    triggerButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    await settleFakeAsyncWork();
    expect(el.textContent).toContain(`runId: ${runId}`);
    expect(el.textContent).toContain("polling: on");

    await settleFakeAsyncWork();
    expect(el.textContent).toContain("status: running");

    await vi.advanceTimersByTimeAsync(1500);
    await settleFakeAsyncWork();
    expect(el.textContent).toContain("status: completed");
    expect(el.textContent).toContain("polling: off");
    expect(el.textContent).toContain("triagedTicketCount: 12");

    handle?.unmount?.();
    expect(el.textContent).toBe("");

    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });
});
