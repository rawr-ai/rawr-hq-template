import { describe, expect, it } from "vitest";
import { createServerApp } from "../src/app";

describe("server baseline", () => {
  it("serves /health without binding a port", async () => {
    const app = createServerApp();
    const res = await app.handle(new Request("http://localhost/health"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });
});
