import { describe, expect, it } from "vitest";

import { deriveAgentPluginControllerLayout } from "../../src/lib/agent-plugins/layout";

describe("agent-plugin controller layout", () => {
  it("derives both stable owners only from the verified controller data root", () => {
    const originalHome = process.env.HOME;
    const originalData = process.env.RAWR_DATA_DIR;
    process.env.HOME = "/hostile/home";
    process.env.RAWR_DATA_DIR = "/hostile/data";

    try {
      expect(deriveAgentPluginControllerLayout({ dataRoot: "/verified/controller-data" })).toEqual({
        artifactStoreRoot: "/verified/controller-data/agent-plugins/artifacts-v1",
        capsuleRoot: "/verified/controller-data/agent-plugins/last-operation-v1",
      });
    } finally {
      if (originalHome === undefined) delete process.env.HOME;
      else process.env.HOME = originalHome;
      if (originalData === undefined) delete process.env.RAWR_DATA_DIR;
      else process.env.RAWR_DATA_DIR = originalData;
    }
  });

  it.each([
    "relative/data",
    "/verified/controller-data/../other",
    "/verified/controller-data/.",
  ])("rejects noncanonical data root %s", (dataRoot) => {
    expect(() => deriveAgentPluginControllerLayout({ dataRoot })).toThrow(
      "AGENT_PLUGIN_CONTROLLER_DATA_ROOT_INVALID",
    );
  });
});
