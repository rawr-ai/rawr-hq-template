import { describe, expect, it } from "vitest";
import { createServerApp } from "../src/app";
import { mountServerPlugins } from "../src/plugins";

describe("server baseline", () => {
  it("serves /health without binding a port", async () => {
    const app = createServerApp();
    const res = await app.handle(new Request("http://localhost/health"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it("can mount workspace plugins via registration functions", async () => {
    const app = await mountServerPlugins(
      createServerApp(),
      [
        {
          name: "test-plugin",
          register: (a) => a.get("/plugin-test", () => ({ mounted: true })),
        },
      ],
      { baseUrl: "http://localhost:3000" },
    );

    const res = await app.handle(new Request("http://localhost/plugin-test"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ mounted: true });
  });
});
