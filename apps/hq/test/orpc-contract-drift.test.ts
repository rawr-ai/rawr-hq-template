import { describe, expect, it } from "vitest";
import { createRawrHqManifest } from "../rawr.hq";

describe("hq orpc composition selection", () => {
  const manifest = createRawrHqManifest();

  it("keeps the expected internal capability declarations selected for HQ composition", () => {
    expect(Object.keys(manifest.roles.server.api)).toEqual(["coordination", "state", "exampleTodo"]);
    expect(Object.keys(manifest.roles.async.workflows)).toEqual(["supportExample", "coordination"]);

    expect(manifest.roles.server.api.coordination.declaration?.internal.contract).toBeDefined();
    expect(manifest.roles.server.api.state.declaration?.internal.contract).toBeDefined();
    expect(manifest.roles.server.api.exampleTodo.declaration?.internal.contract).toBeDefined();
    expect(manifest.roles.async.workflows.supportExample.declaration?.internal?.contract).toBeDefined();
    expect(manifest.roles.async.workflows.coordination.declaration?.internal?.contract).toBeDefined();
  });

  it("keeps publication selection declarative rather than realized", () => {
    expect(manifest.roles.server.api.exampleTodo.declaration?.published?.contract).toBeDefined();
    expect(manifest.roles.server.api.coordination.declaration?.published).toBeUndefined();
    expect(manifest.roles.server.api.state.declaration?.published).toBeUndefined();

    expect(manifest.roles.async.workflows.supportExample.declaration?.published?.routeBase).toBe("/support-example/triage");
    expect(manifest.roles.async.workflows.coordination.declaration?.published?.routeBase).toBe("/coordination");
  });
});
