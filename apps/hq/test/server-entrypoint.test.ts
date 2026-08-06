import { beforeEach, describe, expect, it, vi } from "vitest";

const host = vi.hoisted(() => ({
  bootstrap: vi.fn(async () => ({
    app: {},
    config: {
      port: 3100,
      baseUrl: "http://localhost:3100",
    },
    telemetry: {
      shutdown: async () => {},
    },
  })),
  start: vi.fn(async () => ({
    app: {},
    config: {
      port: 3100,
      baseUrl: "http://localhost:3100",
    },
    telemetry: {
      shutdown: async () => {},
    },
  })),
}));

vi.mock("@rawr/server/host", () => ({
  bootstrapServerHost: host.bootstrap,
  startServerHost: host.start,
}));

import { bootstrapRawrHqServer, startRawrHqServer } from "../server";

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
});
