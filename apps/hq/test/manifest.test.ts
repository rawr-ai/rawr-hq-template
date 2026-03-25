import { describe, expect, it } from "vitest";
import { createRawrHqManifest } from "../src/manifest";

describe("hq app manifest", () => {
  it("keeps authority on composition-only plugin selection", () => {
    const manifest = createRawrHqManifest();

    expect(Object.keys(manifest.plugins.api)).toEqual(["coordination", "state", "exampleTodo"]);
    expect(Object.keys(manifest.plugins.workflows)).toEqual(["supportExample", "coordination"]);
    expect(manifest.plugins.api.exampleTodo.declaration?.published).toBeDefined();
    expect(manifest.plugins.api.coordination.declaration?.published).toBeUndefined();
    expect(manifest.plugins.api.state.declaration?.published).toBeUndefined();
    expect(manifest.plugins.workflows.supportExample.declaration?.published?.routeBase).toBe("/support-example/triage");
    expect(manifest.plugins.workflows.coordination.declaration?.published?.routeBase).toBe("/coordination");
    expect(manifest.plugins.workflows.supportExample.declaration?.runtime?.kind).toBe("inngest-functions");
    expect(manifest.plugins.workflows.coordination.declaration?.runtime?.kind).toBe("inngest-functions");
    expect("fixtures" in manifest).toBe(false);
    expect("orpc" in manifest).toBe(false);
    expect("workflows" in manifest).toBe(false);
  });
});
