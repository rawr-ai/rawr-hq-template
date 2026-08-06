import { describe, expect, it, vi } from "vitest";
import { type BootstrapServerInput, startServer } from "../src/bootstrap";
import { createTestingServerProcessRuntime } from "./support/process-runtime";

function createInput(input: {
  app: {
    server?: unknown;
    listen(port: number): unknown;
    stop?(closeActiveConnections?: boolean): Promise<unknown>;
  };
  shutdown: (deadlineMonotonicMilliseconds?: number) => Promise<void>;
  loadConfig?: () => Promise<unknown>;
  registerRoutes?: BootstrapServerInput["registerRoutes"];
}): BootstrapServerInput {
  const processRuntime = createTestingServerProcessRuntime();
  return {
    telemetryConfig: {
      enabled: false,
      processIdentity: {
        serviceName: "rawr-hq-test",
        deploymentEnvironment: "test",
        processRole: "server-test",
        processInstanceId: "server-test-1",
      },
    },
    registerRoutes: input.registerRoutes ?? ((app) => app),
    overrides: {
      env: {
        RAWR_SERVER_PORT: "3100",
        RAWR_SERVER_BASE_URL: "http://localhost:3100",
      },
      resolveRepoRoot: () => "/tmp/rawr-server-host-test",
      createInngestClient: () => processRuntime.inngestClient,
      acquireTelemetry: async () => ({
        ...processRuntime.telemetry,
        shutdown: async (deadlineMonotonicMilliseconds) => {
          await input.shutdown(deadlineMonotonicMilliseconds);
          return {
            outcome: "flushed" as const,
            diagnostics: [],
          };
        },
      }),
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

  it("stops intake once, drains admitted work, and shares the first deadline", async () => {
    let settleStop: (() => void) | undefined;
    const stopping = new Promise<void>((resolve) => {
      settleStop = resolve;
    });
    const stop = vi.fn(() => stopping);
    const shutdown = vi.fn(async () => {});
    const server = await startServer(
      createInput({
        app: { server: {}, listen: vi.fn(), stop },
        shutdown,
      })
    );
    const deadline = performance.now() + 5_000;

    const first = server.shutdown(deadline);
    const repeated = server.shutdown(deadline + 1_000);

    expect(first).toBe(repeated);
    expect(stop).toHaveBeenCalledOnce();
    expect(stop).toHaveBeenCalledWith(false);
    expect(shutdown).not.toHaveBeenCalled();

    settleStop?.();
    await first;

    expect(shutdown).toHaveBeenCalledOnce();
    expect(shutdown).toHaveBeenCalledWith(deadline);
  });

  it("stops waiting at an expired deadline and still attempts telemetry release", async () => {
    const stop = vi.fn(() => new Promise<never>(() => {}));
    const shutdown = vi.fn(async () => {});
    const server = await startServer(
      createInput({
        app: { server: {}, listen: vi.fn(), stop },
        shutdown,
      })
    );
    const deadline = performance.now() - 1;

    await server.shutdown(deadline);

    expect(stop).toHaveBeenCalledWith(false);
    expect(shutdown).toHaveBeenCalledWith(deadline);
  });

  it("contains telemetry failure after host drain", async () => {
    const server = await startServer(
      createInput({
        app: { server: {}, listen: vi.fn(), stop: vi.fn(async () => {}) },
        shutdown: vi.fn(async () => {
          throw new Error("telemetry shutdown failed");
        }),
      })
    );

    await expect(server.shutdown()).resolves.toBeUndefined();
  });

  it("releases telemetry before preserving a native host-stop failure", async () => {
    const hostFailure = new Error("host stop failed");
    const shutdown = vi.fn(async () => {});
    const server = await startServer(
      createInput({
        app: {
          server: {},
          listen: vi.fn(),
          stop: vi.fn(async () => {
            throw hostFailure;
          }),
        },
        shutdown,
      })
    );

    await expect(server.shutdown()).rejects.toBe(hostFailure);
    expect(shutdown).toHaveBeenCalledOnce();
  });
});
