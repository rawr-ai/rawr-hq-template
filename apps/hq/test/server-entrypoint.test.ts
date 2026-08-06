import { beforeEach, describe, expect, it, vi } from "vitest";

const host = vi.hoisted(() => {
  const shutdown = vi.fn(async () => {});
  const result = () => ({
    app: {},
    config: {
      port: 3100,
      baseUrl: "http://localhost:3100",
    },
    telemetry: {
      shutdown: async () => {},
    },
    shutdown,
  });
  return {
    shutdown,
    bootstrap: vi.fn(async () => result()),
    start: vi.fn(async () => result()),
  };
});

vi.mock("@rawr/server/host", () => ({
  bootstrapServerHost: host.bootstrap,
  startServerHost: host.start,
}));

import {
  bootstrapRawrHqServer,
  installRawrHqServerShutdownSignals,
  startRawrHqServer,
} from "../server";

type TestSignal = "SIGINT" | "SIGTERM";

function createSignalHost(exitCode?: number) {
  const listeners = new Map<TestSignal, () => void>();
  return {
    listeners,
    host: {
      exitCode,
      once(signal: TestSignal, listener: () => void) {
        listeners.set(signal, listener);
      },
      off(signal: TestSignal, listener: () => void) {
        if (listeners.get(signal) === listener) listeners.delete(signal);
      },
    },
  };
}

describe("HQ server entrypoint", () => {
  const telemetryOptions = {
    env: {},
    generateProcessInstanceId: () => "server-entrypoint-test-instance",
  };
  const telemetryConfig = {
    enabled: false,
    processIdentity: {
      serviceName: "rawr-hq",
      processRole: "server",
      processInstanceId: "server-entrypoint-test-instance",
    },
  };

  beforeEach(() => {
    host.bootstrap.mockClear();
    host.start.mockClear();
    host.shutdown.mockClear();
    host.shutdown.mockResolvedValue(undefined);
  });

  it("projects the selected declarations through the non-listening host boundary", async () => {
    const result = await bootstrapRawrHqServer(telemetryOptions);

    expect(host.bootstrap).toHaveBeenCalledOnce();
    expect(host.bootstrap).toHaveBeenCalledWith({
      declarations: {
        api: result.manifest.roles.server.api,
        workflows: result.manifest.roles.async.workflows,
      },
      telemetryConfig,
    });
    expect(host.start).not.toHaveBeenCalled();
    expect(result.role).toBe("server");
  });

  it("projects the selected declarations through the listening host boundary", async () => {
    const result = await startRawrHqServer(telemetryOptions);

    expect(host.start).toHaveBeenCalledOnce();
    expect(host.start).toHaveBeenCalledWith({
      declarations: {
        api: result.manifest.roles.server.api,
        workflows: result.manifest.roles.async.workflows,
      },
      telemetryConfig,
    });
    expect(host.bootstrap).not.toHaveBeenCalled();
    expect(result.role).toBe("server");
  });

  it("shares one shutdown and selects the first signal status", async () => {
    const result = await startRawrHqServer(telemetryOptions);
    const signal = createSignalHost();
    installRawrHqServerShutdownSignals(result.bootstrapped, signal.host);
    const onSigint = signal.listeners.get("SIGINT");
    const onSigterm = signal.listeners.get("SIGTERM");
    if (onSigint === undefined || onSigterm === undefined) {
      throw new Error("expected both server signal handlers");
    }

    onSigint();
    onSigterm();
    await vi.waitFor(() => expect(host.shutdown).toHaveBeenCalledOnce());

    expect(signal.host.exitCode).toBe(130);
    expect(signal.listeners.size).toBe(0);
  });

  it("preserves an existing process status and contains shutdown failure", async () => {
    host.shutdown.mockRejectedValueOnce(new Error("host stop failed"));
    const result = await startRawrHqServer(telemetryOptions);
    const signal = createSignalHost(17);
    installRawrHqServerShutdownSignals(result.bootstrapped, signal.host);

    signal.listeners.get("SIGTERM")?.();
    await vi.waitFor(() => expect(host.shutdown).toHaveBeenCalledOnce());

    expect(signal.host.exitCode).toBe(17);
  });
});
