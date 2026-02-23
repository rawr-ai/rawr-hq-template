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
      firstPartyDefault: {
        transport: "RPCLink",
        triggerRun: "POST /rpc (procedure: triggerSupportTriage)",
        getStatus: "POST /rpc (procedure: getSupportTriageStatus; optional: { runId })",
      },
    },
  }));
}
