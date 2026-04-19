import { describe, expect, it } from "vitest";
import { createRawrHqManifest } from "../src/manifest";

describe("hq published api composition selection", () => {
  const manifest = createRawrHqManifest();

  it("publishes only the example-todo API capability from HQ declarations", () => {
    expect(manifest.plugins.api.exampleTodo.declaration?.published?.contract).toBeDefined();
    expect(manifest.plugins.api.coordination.declaration?.published).toBeUndefined();
    expect(manifest.plugins.api.state.declaration?.published).toBeUndefined();
  });
});
