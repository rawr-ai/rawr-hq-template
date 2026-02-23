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
      publishedBoundary: {
        triggerRun: "POST /api/workflows/support-triage/runs",
        getStatus: "GET /api/workflows/support-triage/status?runId=...",
      },
    },
  }));
}
