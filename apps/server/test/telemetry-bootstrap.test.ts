import { describe, expect, it, vi } from "vitest";

vi.mock("../src/rawr", () => ({
  registerRawrRoutes: (app: unknown) => app,
}));

describe("server telemetry bootstrap", () => {
  it("installs telemetry before app creation and route registration", { timeout: 15000 }, async () => {
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
        metrics: { url: undefined, headers: undefined, exportIntervalMillis: 1000 },
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
      registerRoutes: (currentApp) => {
        order.push("register-routes");
        return currentApp;
      },
    });

    expect(order).toEqual([
      "telemetry",
      "create-app",
      "register-routes",
    ]);
    expect(bootstrapped.telemetry).toBe(telemetry);
  });
});
