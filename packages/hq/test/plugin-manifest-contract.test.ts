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

  it("parses api and workflows discovery roots when rawr.kind matches", () => {
    const apiParsed = parseWorkspacePluginManifest({
      manifest: {
        name: "@rawr/support-api",
        rawr: {
          kind: "api",
          capability: "support",
        },
      },
      pkgJsonPath: "/repo/plugins/api/support/package.json",
      discoveryRoot: "api",
    });

    const workflowsParsed = parseWorkspacePluginManifest({
      manifest: {
        name: "@rawr/support-workflows",
        rawr: {
          kind: "workflows",
          capability: "support",
        },
      },
      pkgJsonPath: "/repo/plugins/workflows/support/package.json",
      discoveryRoot: "workflows",
    });

    expect(apiParsed).toEqual({
      name: "@rawr/support-api",
      kind: "api",
      capability: "support",
    });

    expect(workflowsParsed).toEqual({
      name: "@rawr/support-workflows",
      kind: "workflows",
      capability: "support",
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
