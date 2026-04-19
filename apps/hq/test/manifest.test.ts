import { describe, expect, it } from "vitest";
import { createTestingRawrHqManifest } from "../src/testing";

describe("hq app manifest", () => {
  it("keeps authority on the reserved app seam", () => {
    const manifest = createTestingRawrHqManifest();

    expect(Object.keys(manifest.orpc.router)).toContain("coordination");
    expect(Object.keys(manifest.orpc.router)).toContain("state");
    expect(manifest.workflows.capabilities["support-example"]?.pathPrefix).toBe("/support-example/triage");
  });
});
