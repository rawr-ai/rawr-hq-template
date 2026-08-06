import { describe, expect, it, vi } from "vitest";
import { createTestingServerProcessRuntime } from "./support/process-runtime";

vi.mock("../src/rawr", () => ({
  createHostInngestClient: vi.fn(),
  registerRawrRoutes: (app: unknown) => app,
}));

describe("server telemetry bootstrap", () => {
  it("acquires telemetry with the route-mounted Inngest client before app assembly", {
    timeout: 15000,
  }, async () => {
    const { bootstrapServer } = await import("../src/bootstrap");
    const order: string[] = [];
    const app = { label: "app" } as never;
    const processRuntime = createTestingServerProcessRuntime();

    const bootstrapped = await bootstrapServer({
      telemetryConfig: {
        enabled: false,
        processIdentity: {
          serviceName: "rawr-hq-test",
          deploymentEnvironment: "test",
          processRole: "server-test",
          processInstanceId: "server-test-1",
        },
      },
      registerRoutes: (currentApp, options) => {
        order.push("register-routes");
        expect(options.inngestClient).toBe(processRuntime.inngestClient);
        expect(options.telemetry).toBe(processRuntime.telemetry);
        return currentApp;
      },
      overrides: {
        env: { NODE_ENV: "test" } as NodeJS.ProcessEnv,
        resolveRepoRoot: () => "/tmp/rawr-test-repo",
        createInngestClient: () => {
          order.push("create-inngest-client");
          return processRuntime.inngestClient;
        },
        acquireTelemetry: async ({ inngestClient }) => {
          order.push("telemetry");
          expect(inngestClient).toBe(processRuntime.inngestClient);
          return processRuntime.telemetry;
        },
        createApp: () => {
          order.push("create-app");
          return app;
        },
        loadConfig: async () => ({ config: {} }) as never,
      },
    });

    expect(order).toEqual(["create-inngest-client", "telemetry", "create-app", "register-routes"]);
    expect(bootstrapped.telemetry).toBe(processRuntime.telemetry);
  });
});
