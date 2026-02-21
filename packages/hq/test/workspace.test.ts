import { describe, expect, it } from "vitest";

import { filterPluginsByKind, resolvePluginId, type WorkspacePlugin } from "../src/workspace";

describe("@rawr/hq workspace helpers", () => {
  const plugins: WorkspacePlugin[] = [
    {
      id: "@rawr/plugin-alpha",
      name: "@rawr/plugin-alpha",
      dirName: "alpha",
      absPath: "/repo/plugins/web/alpha",
      kind: "web",
      capability: "alpha",
    },
    {
      id: "@rawr/plugin-beta",
      name: "@rawr/plugin-beta",
      dirName: "beta",
      absPath: "/repo/plugins/web/beta",
      kind: "toolkit",
      capability: "beta",
    },
  ];

  it("filters by rawr.kind", () => {
    const visible = filterPluginsByKind(plugins, "web");
    expect(visible.map((plugin) => plugin.id)).toEqual(["@rawr/plugin-alpha"]);
  });

  it("resolves by package id or directory name", () => {
    expect(resolvePluginId(plugins, "@rawr/plugin-alpha")?.dirName).toBe("alpha");
    expect(resolvePluginId(plugins, "alpha")?.id).toBe("@rawr/plugin-alpha");
    expect(resolvePluginId(plugins, "missing")).toBeUndefined();
  });
});
