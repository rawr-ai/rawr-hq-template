import { describe, expect, it } from "vitest";
import { createRawrHqManifest } from "../src/manifest";

describe("hq app manifest", () => {
  it("keeps authority on composition-only plugin selection", () => {
    const manifest = createRawrHqManifest();

    expect(Object.keys(manifest.plugins.api)).toEqual(["state", "exampleTodo"]);
    expect(Object.keys(manifest.plugins.workflows)).toEqual([]);
    expect(manifest.plugins.api.exampleTodo.declaration?.published).toBeDefined();
    expect(manifest.plugins.api.state.declaration?.published).toBeUndefined();
    expect("fixtures" in manifest).toBe(false);
    expect("orpc" in manifest).toBe(false);
    expect("workflows" in manifest).toBe(false);
  });
});
