import { describe, expect, it, vi } from "vitest";
import { type BootstrapServerInput, startServer } from "../src/bootstrap";

function createInput(input: {
  app: { listen(port: number): unknown };
  shutdown: () => Promise<void>;
  loadConfig?: () => Promise<unknown>;
  registerRoutes?: BootstrapServerInput["registerRoutes"];
}): BootstrapServerInput {
  return {
    registerRoutes: input.registerRoutes ?? ((app) => app),
    overrides: {
      env: {
        RAWR_SERVER_PORT: "3100",
        RAWR_SERVER_BASE_URL: "http://localhost:3100",
      },
      resolveRepoRoot: () => "/tmp/rawr-server-host-test",
      installTelemetry: async () => ({ shutdown: input.shutdown }) as never,
      createApp: () => input.app as never,
      loadConfig: (input.loadConfig ?? (async () => ({ config: {} }))) as never,
    },
  };
}

describe("server process host", () => {
  it("does not listen until asynchronous bootstrap work completes", async () => {
    const listen = vi.fn();
    let resolveConfig: ((value: unknown) => void) | undefined;
    const config = new Promise((resolve) => {
      resolveConfig = resolve;
    });

    const starting = startServer(
      createInput({
        app: { listen },
        shutdown: vi.fn(),
        loadConfig: () => config,
      })
    );

    expect(listen).not.toHaveBeenCalled();
    resolveConfig?.({ config: {} });

    const server = await starting;
    expect(server.config).toEqual({
      port: 3100,
      baseUrl: "http://localhost:3100",
    });
    expect(listen).toHaveBeenCalledOnce();
    expect(listen).toHaveBeenCalledWith(3100);
  });

  it("releases telemetry when route assembly fails without listening", async () => {
    const listen = vi.fn();
    const shutdown = vi.fn(async () => {});

    await expect(
      startServer(
        createInput({
          app: { listen },
          shutdown,
          registerRoutes: () => {
            throw new Error("route assembly failed");
          },
        })
      )
    ).rejects.toThrow("route assembly failed");

    expect(listen).not.toHaveBeenCalled();
    expect(shutdown).toHaveBeenCalledOnce();
  });

  it("releases telemetry when opening the listening socket fails", async () => {
    const shutdown = vi.fn(async () => {});

    await expect(
      startServer(
        createInput({
          app: {
            listen() {
              throw new Error("address in use");
            },
          },
          shutdown,
        })
      )
    ).rejects.toThrow("address in use");

    expect(shutdown).toHaveBeenCalledOnce();
  });
});
