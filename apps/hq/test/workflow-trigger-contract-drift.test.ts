import { describe, expect, it } from "vitest";
import { createRawrHqManifest } from "../rawr.hq";

describe("hq workflow publication selection", () => {
  const manifest = createRawrHqManifest();

  it("keeps workflow publication declarative and capability-scoped", () => {
    expect(manifest.roles.async.workflows.supportExample.declaration?.published?.routeBase).toBe("/support-example/triage");
    expect(manifest.roles.async.workflows.coordination.declaration?.published?.routeBase).toBe("/coordination");
    expect(manifest.roles.async.workflows.supportExample.declaration?.published?.contract).toBeDefined();
    expect(manifest.roles.async.workflows.coordination.declaration?.published?.contract).toBeDefined();
  });

  it("keeps workflow runtime declarations on the process-owned inngest surface", () => {
    expect(manifest.roles.async.workflows.supportExample.declaration?.runtime?.kind).toBe("inngest-functions");
    expect(manifest.roles.async.workflows.coordination.declaration?.runtime?.kind).toBe("inngest-functions");
  });
});
