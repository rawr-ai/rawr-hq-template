import { Inngest } from "inngest";
import { describe, expect, it } from "vitest";

import { acquireServerTelemetry } from "../src/telemetry";

describe("server telemetry lifecycle", () => {
  it("acquires the disabled provider without vendor state and shares one shutdown", async () => {
    const telemetry = await acquireServerTelemetry({
      config: {
        enabled: false,
        processIdentity: {
          serviceName: "rawr-hq-test",
          deploymentEnvironment: "test",
          processRole: "server-test",
          processInstanceId: "server-test-1",
        },
      },
      inngestClient: new Inngest({ id: "rawr-hq-server-test" }),
    });

    expect(telemetry.telemetry.availability).toBe("disabled");

    const firstShutdown = telemetry.shutdown();
    const repeatedShutdown = telemetry.shutdown();

    expect(repeatedShutdown).toBe(firstShutdown);
    await expect(firstShutdown).resolves.toEqual({
      outcome: "flushed",
      diagnostics: [],
    });
  });
});
