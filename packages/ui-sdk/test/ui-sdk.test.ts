import { describe, expect, it } from "vitest";
import { defineMicroFrontend } from "../src/index";

describe("ui-sdk baseline", () => {
  it("defines a micro-frontend module", () => {
    const module = defineMicroFrontend(() => undefined);
    expect(typeof module.mount).toBe("function");
  });
});

