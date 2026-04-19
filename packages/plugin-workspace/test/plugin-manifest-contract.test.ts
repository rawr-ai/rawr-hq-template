import { describe, expect, it } from "vitest";

import { parseWorkspacePluginManifest } from "../src/plugin-manifest-contract";

describe("plugin workspace manifest contract", () => {
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

  it("parses canonical runtime discovery roots when rawr.kind matches", () => {
    const apiParsed = parseWorkspacePluginManifest({
      manifest: {
        name: "@rawr/support-api",
        rawr: {
          kind: "api",
          capability: "support",
        },
      },
      pkgJsonPath: "/repo/plugins/server/api/support/package.json",
      discoveryRoot: "server/api",
    });

    const workflowsParsed = parseWorkspacePluginManifest({
      manifest: {
        name: "@rawr/support-workflows",
        rawr: {
          kind: "workflows",
          capability: "support",
        },
      },
      pkgJsonPath: "/repo/plugins/async/workflows/support/package.json",
      discoveryRoot: "async/workflows",
    });

    const schedulesParsed = parseWorkspacePluginManifest({
      manifest: {
        name: "@rawr/support-schedules",
        rawr: {
          kind: "schedules",
          capability: "support",
        },
      },
      pkgJsonPath: "/repo/plugins/async/schedules/support/package.json",
      discoveryRoot: "async/schedules",
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

    expect(schedulesParsed).toEqual({
      name: "@rawr/support-schedules",
      kind: "schedules",
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
