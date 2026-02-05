import { describe, expect, it } from "vitest";
import { validateRawrConfig } from "../src/index.js";

describe("@rawr/control-plane validateRawrConfig", () => {
  it("accepts a minimal v1 config", () => {
    const r = validateRawrConfig({ version: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.config.version).toBe(1);
  });

  it("allows missing optional fields", () => {
    const r = validateRawrConfig({ version: 1, plugins: {} });
    expect(r.ok).toBe(true);
  });

  it("rejects unknown versions", () => {
    const r = validateRawrConfig({ version: 2 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.issues.some((i) => i.path === "version")).toBe(true);
  });

  it("clamps journal semantic candidateLimit into 1..500 and defaults to 200", () => {
    const r1 = validateRawrConfig({ version: 1, journal: { semantic: {} } });
    expect(r1.ok).toBe(true);
    if (r1.ok) expect(r1.config.journal?.semantic?.candidateLimit).toBe(200);

    const r2 = validateRawrConfig({ version: 1, journal: { semantic: { candidateLimit: 9999 } } });
    expect(r2.ok).toBe(true);
    if (r2.ok) expect(r2.config.journal?.semantic?.candidateLimit).toBe(500);

    const r3 = validateRawrConfig({ version: 1, journal: { semantic: { candidateLimit: -10 } } });
    expect(r3.ok).toBe(true);
    if (r3.ok) expect(r3.config.journal?.semantic?.candidateLimit).toBe(1);
  });
});

