import { describe, expect, it } from "vitest";
import { createRawrHqManifest } from "../rawr.hq";

describe("hq orpc composition selection", () => {
  const manifest = createRawrHqManifest();

  it("keeps the expected internal capability declarations selected for HQ composition", () => {
    expect(Object.keys(manifest.roles.server.api)).toEqual(["exampleTodo"]);
    expect(Object.keys(manifest.roles.async.workflows)).toEqual([]);

    expect(manifest.roles.server.api.exampleTodo.declaration?.internal.contract).toBeDefined();
  });

  it("keeps publication selection declarative rather than realized", () => {
    expect(manifest.roles.server.api.exampleTodo.declaration?.published?.contract).toBeDefined();
  });
});
