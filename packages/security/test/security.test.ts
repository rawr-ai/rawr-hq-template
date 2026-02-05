import { describe, expect, it } from "vitest";
import type { SecurityReport } from "../src";

describe("@rawr/security", () => {
  it("types compile", () => {
    const r: SecurityReport = { ok: true };
    expect(r.ok).toBe(true);
  });
});

