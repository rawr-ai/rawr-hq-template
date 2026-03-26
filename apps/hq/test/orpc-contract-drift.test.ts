import { describe, expect, it } from "vitest";
import { createRawrHqManifest } from "../rawr.hq";

describe("hq orpc composition selection", () => {
  const manifest = createRawrHqManifest();

  it("keeps the expected internal capability declarations selected for HQ composition", () => {
    expect(Object.keys(manifest.roles.server.api)).toEqual(["coordination", "state", "exampleTodo"]);
    expect(Object.keys(manifest.roles.async.workflows)).toEqual(["supportExample", "coordination"]);

    expect(manifest.roles.server.api.coordination.exposure.internal.contract).toBeDefined();
    expect(manifest.roles.server.api.state.exposure.internal.contract).toBeDefined();
    expect(manifest.roles.server.api.exampleTodo.exposure.internal.contract).toBeDefined();
    expect(manifest.roles.async.workflows.supportExample.exposure.internal?.contract).toBeDefined();
    expect(manifest.roles.async.workflows.coordination.exposure.internal?.contract).toBeDefined();
  });

  it("keeps publication selection declarative rather than realized", () => {
    expect(manifest.roles.server.api.exampleTodo.exposure.published?.contract).toBeDefined();
    expect(manifest.roles.server.api.coordination.exposure.published).toBeUndefined();
    expect(manifest.roles.server.api.state.exposure.published).toBeUndefined();

    expect(manifest.roles.async.workflows.supportExample.exposure.published?.routeBase).toBe("/support-example/triage");
    expect(manifest.roles.async.workflows.coordination.exposure.published?.routeBase).toBe("/coordination");
  });
});
