export const name = "@rawr/plugin-mfe-demo";

export function registerServer(app: any, _ctx: { baseUrl: string }) {
  app.get("/mfe-demo/health", () => ({
    ok: true,
    plugin: name,
    capability: "demo-plugin",
    demo: true,
  }));

  app.get("/mfe-demo/status", () => ({
    ok: true,
    plugin: name,
    capability: "demo-plugin",
    demo: true,
    routeHints: {
      firstPartyDefault: {
        transport: "RPCLink",
        status: "POST /rpc/state/getRuntimeState",
        publication: "GET /api/orpc/exampleTodo/tasks/{id}",
      },
    },
  }));
}
