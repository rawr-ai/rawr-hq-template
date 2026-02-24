export const name = "@rawr/plugin-mfe-demo";

export function registerServer(app: any, _ctx: { baseUrl: string }) {
  app.get("/mfe-demo/health", () => ({
    ok: true,
    plugin: name,
    capability: "support-example",
    exampleDomain: true,
  }));

  app.get("/mfe-demo/support-example/status", () => ({
    ok: true,
    plugin: name,
    capability: "support-example",
    exampleDomain: true,
    routeHints: {
      firstPartyDefault: {
        transport: "RPCLink",
        triggerRun: "POST /rpc (procedure: triggerSupportExample)",
        getStatus: "POST /rpc (procedure: getSupportExampleStatus; optional: { runId })",
      },
    },
  }));
}
