import { describe, expect, it } from "vitest";
import { createRawrHqManifest } from "../rawr.hq";

describe("hq app manifest", () => {
  it("keeps authority on composition-only plugin selection", () => {
    const manifest = createRawrHqManifest();

    expect(manifest.id).toBe("hq");
    expect(Object.keys(manifest.roles.server.api)).toEqual(["exampleTodo"]);
    expect(Object.keys(manifest.roles.async.workflows)).toEqual([]);
    expect(Object.keys(manifest.roles.async.schedules)).toEqual([]);
    expect(manifest.roles.server.api.exampleTodo.declaration?.published).toBeDefined();
    expect("fixtures" in manifest).toBe(false);
    expect("orpc" in manifest).toBe(false);
    expect("workflows" in manifest).toBe(false);
  });
});
