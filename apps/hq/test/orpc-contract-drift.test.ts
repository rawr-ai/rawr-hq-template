import { describe, expect, it } from "vitest";
import { createRawrHqManifest } from "../src/manifest";

describe("hq orpc composition selection", () => {
  const manifest = createRawrHqManifest();

  it("keeps the expected internal capability declarations selected for HQ composition", () => {
    expect(Object.keys(manifest.plugins.api)).toEqual(["state", "exampleTodo"]);
    expect(Object.keys(manifest.plugins.workflows)).toEqual([]);

    expect(manifest.plugins.api.state.declaration?.internal.contract).toBeDefined();
    expect(manifest.plugins.api.exampleTodo.declaration?.internal.contract).toBeDefined();
  });

  it("keeps publication selection declarative rather than realized", () => {
    expect(manifest.plugins.api.exampleTodo.declaration?.published?.contract).toBeDefined();
    expect(manifest.plugins.api.state.declaration?.published).toBeUndefined();
  });
});
