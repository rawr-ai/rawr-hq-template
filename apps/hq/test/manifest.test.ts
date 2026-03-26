import { describe, expect, it } from "vitest";
import { createRawrHqManifest } from "../rawr.hq";

describe("hq app manifest", () => {
  it("keeps authority on composition-only plugin selection", () => {
    const manifest = createRawrHqManifest();

    expect(Object.keys(manifest.roles.server.api)).toEqual(["coordination", "state", "exampleTodo"]);
    expect(Object.keys(manifest.roles.async.workflows)).toEqual(["supportExample", "coordination"]);
    expect(manifest.roles.server.api.exampleTodo.exposure.published).toBeDefined();
    expect(manifest.roles.server.api.coordination.exposure.published).toBeUndefined();
    expect(manifest.roles.server.api.state.exposure.published).toBeUndefined();
    expect(manifest.roles.async.workflows.supportExample.exposure.published?.routeBase).toBe("/support-example/triage");
    expect(manifest.roles.async.workflows.coordination.exposure.published?.routeBase).toBe("/coordination");
    expect(manifest.roles.async.workflows.supportExample.exposure.runtime?.kind).toBe("inngest-functions");
    expect(manifest.roles.async.workflows.coordination.exposure.runtime?.kind).toBe("inngest-functions");
    expect("fixtures" in manifest).toBe(false);
    expect("orpc" in manifest).toBe(false);
    expect("workflows" in manifest).toBe(false);
  });
});
