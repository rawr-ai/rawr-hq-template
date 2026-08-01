import { readJson, type Tree, writeJson } from "@nx/devkit";
import { createTreeWithEmptyWorkspace } from "@nx/devkit/testing";
import { describe, expect, it, vi } from "vitest";
import {
  type HabitatConsumerBinding,
  initializeHabitatConsumer,
  removeHabitatHook,
} from "../src/initialization";

const binding = {
  gritPackage: "@getgrit/cli",
  nxPlugin: "@habitat/cli/nx-plugin",
  predecessorNxPlugins: [
    {
      plugin: "@habitat/cli/nx-plugin",
      options: { checkTargetName: "check:policy" },
    },
  ],
  hook: {
    _habitat: { identity: "@habitat/cli:agent-stop", revision: 1 },
    hooks: [
      {
        type: "command",
        command: "bunx --bun --no-install --package @habitat/cli habitat hook agent-stop",
        statusMessage: "Checking Habitat structure laws",
        timeout: 120,
      },
    ],
  },
  predecessorHooks: [
    {
      hooks: [
        {
          type: "command",
          command: "bun predecessor habitat hook agent-stop",
          statusMessage: "Checking Habitat structure laws",
          timeout: 120,
        },
      ],
    },
  ],
} as const satisfies HabitatConsumerBinding;

function consumerTree(input?: {
  readonly nxPlugins?: readonly unknown[];
  readonly sessionStart?: readonly unknown[];
  readonly stop?: readonly unknown[];
  readonly trustedDependencies?: readonly string[];
}): Tree {
  const tree = createTreeWithEmptyWorkspace({ layout: "apps-libs" });
  writeJson(tree, "nx.json", {
    $schema: "./node_modules/nx/schemas/nx-schema.json",
    plugins: input?.nxPlugins ?? ["unrelated-plugin"],
  });
  writeJson(tree, "package.json", {
    name: "consumer",
    private: true,
    trustedDependencies: input?.trustedDependencies ?? ["unrelated-native-package"],
  });
  writeJson(tree, ".codex/hooks.json", {
    owner: "consumer",
    hooks: {
      SessionStart: input?.sessionStart ?? [
        {
          hooks: [{ type: "command", command: "echo start" }],
          matcher: "startup",
        },
      ],
      Stop: input?.stop ?? [
        {
          hooks: [{ type: "command", command: "echo stop" }],
          matcher: "consumer",
        },
      ],
    },
  });
  return tree;
}

describe("Habitat Nx consumer initialization", () => {
  it("adds exact package-owned contributions while preserving consumer configuration", () => {
    const tree = consumerTree();

    expect(initializeHabitatConsumer(tree, binding)).toEqual({ packageChanged: true });

    expect(readJson(tree, "nx.json")).toMatchObject({
      plugins: ["unrelated-plugin", "@habitat/cli/nx-plugin"],
    });
    expect(readJson(tree, "package.json")).toMatchObject({
      name: "consumer",
      trustedDependencies: ["unrelated-native-package", "@getgrit/cli"],
    });
    expect(readJson(tree, ".codex/hooks.json")).toMatchObject({
      owner: "consumer",
      hooks: {
        SessionStart: [
          {
            hooks: [{ type: "command", command: "echo start" }],
            matcher: "startup",
          },
        ],
        Stop: [
          {
            hooks: [{ type: "command", command: "echo stop" }],
            matcher: "consumer",
          },
          binding.hook,
        ],
      },
    });
  });

  it("creates the named hook document when a consumer has none", () => {
    const tree = consumerTree();
    tree.delete(".codex/hooks.json");

    expect(initializeHabitatConsumer(tree, binding)).toEqual({ packageChanged: true });

    expect(readJson(tree, ".codex/hooks.json")).toEqual({
      hooks: { Stop: [binding.hook] },
    });
  });

  it("replaces exact predecessor states in place", () => {
    const tree = consumerTree({
      nxPlugins: ["before", binding.predecessorNxPlugins[0], "after"],
      stop: [
        { hooks: [{ type: "command", command: "echo before" }] },
        binding.predecessorHooks[0],
        { hooks: [{ type: "command", command: "echo after" }] },
      ],
      trustedDependencies: ["@getgrit/cli"],
    });

    expect(initializeHabitatConsumer(tree, binding)).toEqual({ packageChanged: false });
    expect(readJson<{ readonly plugins: readonly unknown[] }>(tree, "nx.json").plugins).toEqual([
      "before",
      "@habitat/cli/nx-plugin",
      "after",
    ]);
    expect(
      readJson<{
        readonly hooks: { readonly Stop: readonly unknown[] };
      }>(tree, ".codex/hooks.json").hooks.Stop
    ).toEqual([
      { hooks: [{ type: "command", command: "echo before" }] },
      binding.hook,
      { hooks: [{ type: "command", command: "echo after" }] },
    ]);
  });

  it("makes no Tree write when initialization is already converged", () => {
    const tree = consumerTree();
    initializeHabitatConsumer(tree, binding);
    const before = tree.listChanges();
    const write = vi.spyOn(tree, "write");

    expect(initializeHabitatConsumer(tree, binding)).toEqual({ packageChanged: false });

    expect(write).not.toHaveBeenCalled();
    expect(tree.listChanges()).toEqual(before);
  });

  it.each([
    {
      label: "duplicate Nx registration",
      tree: () =>
        consumerTree({
          nxPlugins: ["@habitat/cli/nx-plugin", "@habitat/cli/nx-plugin"],
        }),
      message: "multiple Habitat Nx plugin registrations",
    },
    {
      label: "unknown Nx registration",
      tree: () =>
        consumerTree({
          nxPlugins: [{ plugin: "@habitat/cli/nx-plugin", options: { unsupported: true } }],
        }),
      message: "incompatible Habitat Nx plugin registration",
    },
    {
      label: "duplicate hook identity",
      tree: () => consumerTree({ stop: [binding.hook, binding.hook] }),
      message: "multiple Habitat hook contributions",
    },
    {
      label: "hook identity outside Stop",
      tree: () => consumerTree({ sessionStart: [binding.hook] }),
      message: "Habitat hook contribution outside Stop",
    },
    {
      label: "drifted hook payload",
      tree: () =>
        consumerTree({
          stop: [
            {
              ...binding.hook,
              hooks: [{ type: "command", command: "echo drifted" }],
            },
          ],
        }),
      message: "incompatible Habitat hook contribution",
    },
    {
      label: "duplicate Grit trust",
      tree: () =>
        consumerTree({
          trustedDependencies: ["@getgrit/cli", "@getgrit/cli"],
        }),
      message: "duplicate @getgrit/cli trust entries",
    },
  ])("refuses $label before the first Tree write", ({ tree: createTree, message }) => {
    const tree = createTree();
    const write = vi.spyOn(tree, "write");

    expect(() => initializeHabitatConsumer(tree, binding)).toThrow(message);
    expect(write).not.toHaveBeenCalled();
  });

  it("removes only the named hook group and converges", () => {
    const tree = consumerTree();
    initializeHabitatConsumer(tree, binding);

    removeHabitatHook(tree, binding);

    expect(readJson(tree, "nx.json")).toMatchObject({
      plugins: ["unrelated-plugin", "@habitat/cli/nx-plugin"],
    });
    expect(readJson(tree, "package.json")).toMatchObject({
      trustedDependencies: ["unrelated-native-package", "@getgrit/cli"],
    });
    expect(readJson(tree, ".codex/hooks.json")).toMatchObject({
      owner: "consumer",
      hooks: {
        SessionStart: [{ matcher: "startup" }],
        Stop: [{ matcher: "consumer" }],
      },
    });

    const before = tree.listChanges();
    const write = vi.spyOn(tree, "write");
    removeHabitatHook(tree, binding);
    expect(write).not.toHaveBeenCalled();
    expect(tree.listChanges()).toEqual(before);
  });
});
