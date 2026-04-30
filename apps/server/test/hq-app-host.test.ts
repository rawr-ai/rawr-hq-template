import { describe, expect, it, vi } from "vitest";
import {
  bootstrapRawrHqDevHost,
  bootstrapRawrHqServerHost,
  startRawrHqServerHost,
} from "../src/hq-app-host";

describe("HQ app host runtime mount", () => {
  it("boots the server role through the server-owned runtime app host", async () => {
    const listen = vi.fn();
    const fakeBootstrapped = {
      app: { listen },
      config: { port: 3100, baseUrl: "http://localhost:3100" },
      enabledPlugins: new Set<string>(),
      telemetry: { shutdown: vi.fn() },
    } as never;
    const deps = {
      bootstrapServer: async () => fakeBootstrapped,
    };

    const bootstrapped = await bootstrapRawrHqServerHost({ deps });
    const server = await startRawrHqServerHost({ deps });
    const dev = await bootstrapRawrHqDevHost({ deps });

    expect(bootstrapped.role).toBe("server");
    expect(bootstrapped.manifest.id).toBe("hq");
    expect(server.role).toBe("server");
    expect(server.manifest.id).toBe("hq");
    expect(dev.roles).toEqual(["server", "async"]);
    expect(dev.server.manifest.id).toBe("hq");
    expect(listen).toHaveBeenCalledWith(3100);
  });
});
