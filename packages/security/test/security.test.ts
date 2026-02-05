import { describe, expect, it } from "vitest";
import { gateEnable, getSecurityReport, securityCheck } from "../src";
import type { SecurityReport } from "../src";

describe("@rawr/security", () => {
  it("exports the public API", () => {
    expect(typeof securityCheck).toBe("function");
    expect(typeof gateEnable).toBe("function");
    expect(typeof getSecurityReport).toBe("function");
  });

  it("SecurityReport type compiles", () => {
    const r: SecurityReport = {
      ok: true,
      findings: [],
      summary: "vulns=0, untrusted=0, secrets=0",
      timestamp: new Date().toISOString(),
      mode: "repo",
    };
    expect(r.ok).toBe(true);
  });
});
