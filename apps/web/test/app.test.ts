import { describe, expect, it } from "vitest";
import { App } from "../src/ui/App";

describe("web baseline", () => {
  it("exports App", () => {
    expect(typeof App).toBe("function");
  });
});

