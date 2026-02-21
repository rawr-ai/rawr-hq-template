import { describe, expect, it } from "vitest";

import { filterOperationalPlugins, resolvePluginId, type WorkspacePlugin } from "../src/workspace";

describe("@rawr/hq workspace helpers", () => {
  const plugins: WorkspacePlugin[] = [
    {
      id: "@rawr/plugin-alpha",
      name: "@rawr/plugin-alpha",
      dirName: "alpha",
      absPath: "/repo/plugins/web/alpha",
      kind: "web",
      capability: "alpha",
      templateRole: "operational",
      channel: "both",
      publishTier: "candidate",
    },
    {
      id: "@rawr/plugin-beta",
      name: "@rawr/plugin-beta",
      dirName: "beta",
      absPath: "/repo/plugins/web/beta",
      kind: "web",
      capability: "beta",
      templateRole: "fixture",
      channel: "B",
      publishTier: "blocked",
    },
  ];

  it("filters non-operational plugins by default", () => {
    const visible = filterOperationalPlugins(plugins, false);
    expect(visible.map((plugin) => plugin.id)).toEqual(["@rawr/plugin-alpha"]);
  });

  it("resolves by package id or directory name", () => {
    expect(resolvePluginId(plugins, "@rawr/plugin-alpha")?.dirName).toBe("alpha");
    expect(resolvePluginId(plugins, "alpha")?.id).toBe("@rawr/plugin-alpha");
    expect(resolvePluginId(plugins, "missing")).toBeUndefined();
  });
});
