export const name = "@rawr/plugin-mfe-demo";

export function registerServer(app: any, _ctx: { baseUrl: string }) {
  app.get("/mfe-demo/health", () => ({
    ok: true,
    plugin: name,
    capability: "support-triage",
    exampleDomain: true,
  }));

  app.get("/mfe-demo/support-triage/status", () => ({
    ok: true,
    plugin: name,
    capability: "support-triage",
    exampleDomain: true,
    routeHints: {
      firstPartyDefault: "/rpc (supportTriage workflow procedures)",
      publishedBoundary: "/api/workflows/support-triage/*",
    },
    run: {
      runId: "support-triage-demo-run",
      queueId: "queue-demo",
      status: "queued",
    },
  }));
}
