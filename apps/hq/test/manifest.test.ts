import { describe, expect, it } from "vitest";
import { createRawrHqManifest } from "../rawr.hq";

describe("hq app manifest", () => {
  it("keeps authority on composition-only plugin selection", () => {
    const manifest = createRawrHqManifest();

    expect(Object.keys(manifest.roles.server.api)).toEqual(["coordination", "state", "exampleTodo"]);
    expect(Object.keys(manifest.roles.async.workflows)).toEqual(["supportExample", "coordination"]);
    expect(manifest.roles.server.api.exampleTodo.declaration?.published).toBeDefined();
    expect(manifest.roles.server.api.coordination.declaration?.published).toBeUndefined();
    expect(manifest.roles.server.api.state.declaration?.published).toBeUndefined();
    expect(manifest.roles.async.workflows.supportExample.declaration?.published?.routeBase).toBe("/support-example/triage");
    expect(manifest.roles.async.workflows.coordination.declaration?.published?.routeBase).toBe("/coordination");
    expect(manifest.roles.async.workflows.supportExample.declaration?.runtime?.kind).toBe("inngest-functions");
    expect(manifest.roles.async.workflows.coordination.declaration?.runtime?.kind).toBe("inngest-functions");
    expect("fixtures" in manifest).toBe(false);
    expect("orpc" in manifest).toBe(false);
    expect("workflows" in manifest).toBe(false);
  });
});
