import { describe, expect, it } from "vitest";
import { RAWR_CORE_VERSION } from "../src";

describe("@rawr/core", () => {
  it("exports version", () => {
    expect(RAWR_CORE_VERSION).toBe("0.0.0");
  });
});

