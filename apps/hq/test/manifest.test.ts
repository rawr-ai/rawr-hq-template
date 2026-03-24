import { describe, expect, it } from "vitest";
import { createTestingRawrHqManifest } from "../src/testing";

describe("hq app manifest", () => {
  it("keeps authority on the reserved app seam", () => {
    const manifest = createTestingRawrHqManifest();

    expect(Object.keys(manifest.orpc.router)).toContain("coordination");
    expect(Object.keys(manifest.orpc.router)).toContain("state");
    expect(Object.keys(manifest.orpc.router)).toContain("exampleTodo");
    expect(Object.keys(manifest.orpc.published.router)).toEqual(["exampleTodo"]);
    expect(Object.keys(manifest.orpc.published.router)).not.toContain("coordination");
    expect(Object.keys(manifest.orpc.published.router)).not.toContain("state");
    expect(Object.keys(manifest.orpc.published.router)).not.toContain("supportExample");
    expect(manifest.workflows.surfaces).toEqual([
      {
        capability: "support-example",
        routeBase: "/support-example/triage",
        hasInternalRouter: true,
        hasPublishedRouter: true,
        hasRuntimeFunctions: true,
      },
      {
        capability: "coordination",
        routeBase: "/coordination",
        hasInternalRouter: true,
        hasPublishedRouter: true,
        hasRuntimeFunctions: true,
      },
    ]);
    expect(Object.keys(manifest.workflows.internal.router)).toEqual(["supportExample", "coordination"]);
    expect(Object.keys(manifest.workflows.published.router)).toEqual(["supportExample", "coordination"]);
    expect(typeof manifest.workflows.createInngestFunctions).toBe("function");
  });
});
