import { describe, expect, it } from "vitest";

import { parseWorkspacePluginManifest } from "../src/workspace/plugin-manifest-contract";

describe("workspace plugin manifest contract", () => {
  it("parses required rawr.kind + rawr.capability", () => {
    const parsed = parseWorkspacePluginManifest({
      manifest: {
        name: "@rawr/plugin-demo",
        rawr: {
          kind: "web",
          capability: "demo",
        },
      },
      pkgJsonPath: "/repo/plugins/web/demo/package.json",
      discoveryRoot: "web",
    });

    expect(parsed).toEqual({
      name: "@rawr/plugin-demo",
      kind: "web",
      capability: "demo",
    });
  });

  it("hard-fails on forbidden legacy metadata keys", () => {
    expect(() =>
      parseWorkspacePluginManifest({
        manifest: {
          rawr: {
            kind: "toolkit",
            capability: "plugins",
            templateRole: "operational",
          },
        },
        pkgJsonPath: "/repo/plugins/cli/plugins/package.json",
        discoveryRoot: "cli",
      }),
    ).toThrowError("forbidden rawr.templateRole");
  });

  it("hard-fails when rawr.capability is missing", () => {
    expect(() =>
      parseWorkspacePluginManifest({
        manifest: {
          rawr: {
            kind: "toolkit",
          },
        },
        pkgJsonPath: "/repo/plugins/cli/plugins/package.json",
        discoveryRoot: "cli",
      }),
    ).toThrowError("required rawr.capability is missing");
  });

  it("hard-fails when rawr.kind does not match discovery root", () => {
    expect(() =>
      parseWorkspacePluginManifest({
        manifest: {
          rawr: {
            kind: "web",
            capability: "plugins",
          },
        },
        pkgJsonPath: "/repo/plugins/cli/plugins/package.json",
        discoveryRoot: "cli",
      }),
    ).toThrowError('rawr.kind must be "toolkit" for plugins/cli/*');
  });
});
