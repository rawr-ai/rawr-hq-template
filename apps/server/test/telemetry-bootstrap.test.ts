import { describe, expect, it, vi } from "vitest";

vi.mock("../src/rawr", () => ({
  registerRawrRoutes: (app: unknown) => app,
}));

describe("server telemetry bootstrap", () => {
  it("installs telemetry before app creation and route registration", async () => {
    const { bootstrapServer } = await import("../src/bootstrap");
    const order: string[] = [];
    const app = { label: "app" } as never;
    const telemetry = {
      instrumentationNames: ["ORPCInstrumentation", "HttpInstrumentation"],
      options: {
        serviceName: "@rawr/server",
        environment: "test",
        serviceVersion: undefined,
        exporter: { url: undefined, headers: undefined },
        traceExporter: undefined,
      },
      sdk: {} as never,
      shutdown: async () => {},
    };

    const bootstrapped = await bootstrapServer({
      env: { NODE_ENV: "test" } as NodeJS.ProcessEnv,
      resolveRepoRoot: () => "/tmp/rawr-test-repo",
      installTelemetry: async () => {
        order.push("telemetry");
        return telemetry;
      },
      createApp: () => {
        order.push("create-app");
        return app;
      },
      loadConfig: async () => ({ config: {} }) as never,
      loadPlugins: async () => {
        order.push("load-plugins");
        return [];
      },
      loadState: async () => {
        order.push("load-state");
        return { plugins: { enabled: [] } } as never;
      },
      registerRoutes: (currentApp) => {
        order.push("register-routes");
        return currentApp;
      },
      mountPlugins: async (currentApp) => {
        order.push("mount-plugins");
        return currentApp;
      },
    });

    expect(order).toEqual([
      "telemetry",
      "create-app",
      "load-plugins",
      "load-state",
      "register-routes",
      "mount-plugins",
    ]);
    expect(bootstrapped.telemetry).toBe(telemetry);
  });
});
