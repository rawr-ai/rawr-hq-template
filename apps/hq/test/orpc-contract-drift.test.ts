import { describe, expect, it } from "vitest";
import { createRawrHqManifest } from "../src/manifest";

describe("hq orpc composition selection", () => {
  const manifest = createRawrHqManifest();

  it("keeps the expected internal capability declarations selected for HQ composition", () => {
    expect(Object.keys(manifest.plugins.api)).toEqual(["coordination", "state", "exampleTodo"]);
    expect(Object.keys(manifest.plugins.workflows)).toEqual(["supportExample", "coordination"]);

    expect(manifest.plugins.api.coordination.declaration?.internal.contract).toBeDefined();
    expect(manifest.plugins.api.state.declaration?.internal.contract).toBeDefined();
    expect(manifest.plugins.api.exampleTodo.declaration?.internal.contract).toBeDefined();
    expect(manifest.plugins.workflows.supportExample.declaration?.internal?.contract).toBeDefined();
    expect(manifest.plugins.workflows.coordination.declaration?.internal?.contract).toBeDefined();
  });

  it("keeps publication selection declarative rather than realized", () => {
    expect(manifest.plugins.api.exampleTodo.declaration?.published?.contract).toBeDefined();
    expect(manifest.plugins.api.coordination.declaration?.published).toBeUndefined();
    expect(manifest.plugins.api.state.declaration?.published).toBeUndefined();

    expect(manifest.plugins.workflows.supportExample.declaration?.published?.routeBase).toBe("/support-example/triage");
    expect(manifest.plugins.workflows.coordination.declaration?.published?.routeBase).toBe("/coordination");
  });
});
