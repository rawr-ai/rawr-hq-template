import { describe, expect, it } from "vitest";
import { createRawrHqManifest } from "../rawr.hq";

describe("hq workflow publication selection", () => {
  const manifest = createRawrHqManifest();

  it("keeps workflow publication declarative and capability-scoped", () => {
    expect(manifest.roles.async.workflows.supportExample.exposure.published?.routeBase).toBe("/support-example/triage");
    expect(manifest.roles.async.workflows.coordination.exposure.published?.routeBase).toBe("/coordination");
    expect(manifest.roles.async.workflows.supportExample.exposure.published?.contract).toBeDefined();
    expect(manifest.roles.async.workflows.coordination.exposure.published?.contract).toBeDefined();
  });

  it("keeps workflow runtime declarations on the process-owned inngest surface", () => {
    expect(manifest.roles.async.workflows.supportExample.exposure.runtime?.kind).toBe("inngest-functions");
    expect(manifest.roles.async.workflows.coordination.exposure.runtime?.kind).toBe("inngest-functions");
  });
});
