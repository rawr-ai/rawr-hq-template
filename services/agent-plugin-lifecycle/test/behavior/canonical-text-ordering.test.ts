import { describe, expect, it } from "vitest";

import { compareCanonicalText } from "../../src/service/model/policy/canonical-text-ordering";

describe("canonical text ordering policy", () => {
  it("treats equal text as the same canonical value", () => {
    expect(compareCanonicalText("agent-plugin", "agent-plugin")).toBe(0);
  });

  it("orders a UTF-8 prefix before the longer value", () => {
    expect(compareCanonicalText("agent", "agent-plugin")).toBeLessThan(0);
    expect(compareCanonicalText("agent-plugin", "agent")).toBeGreaterThan(0);
  });

  it("orders ASCII text by its UTF-8 bytes", () => {
    expect(compareCanonicalText("alpha", "beta")).toBeLessThan(0);
    expect(compareCanonicalText("beta", "alpha")).toBeGreaterThan(0);
  });

  it("orders supplementary text by UTF-8 bytes rather than UTF-16 code units", () => {
    const privateUse = "\uE000";
    const supplementary = "\u{10000}";

    expect([supplementary, privateUse].sort(compareCanonicalText)).toEqual([
      privateUse,
      supplementary,
    ]);
    expect([supplementary, privateUse].sort()).toEqual([supplementary, privateUse]);
  });
});
