import { readJson, type Tree, writeJson } from "@nx/devkit";
import { createTreeWithEmptyWorkspace } from "@nx/devkit/testing";
import { describe, expect, it, vi } from "vitest";
import {
  type HabitatConsumerBinding,
  initializeHabitatConsumer,
  removeHabitatHook,
} from "../../src/nx/initialization";

const binding = {
  defaultCheckScript: "nx run-many -t check",
  gitHook: {
    path: ".husky/pre-push",
    contents: "unset $(git rev-parse --local-env-vars)\nbun run check\n",
  },
  gritPackage: "@getgrit/cli",
  husky: {
    package: "husky",
    version: "9.1.7",
    prepare: "husky",
    predecessorPrepareScripts: [
      "./scripts/dev/install-repository-hooks.sh",
      "git config core.hooksPath scripts/githooks",
    ],
  },
  nxPlugin: "@habitat-ai/cli/nx-plugin",
  predecessorNxPlugins: [
    {
      plugin: "@habitat/cli/nx-plugin",
      options: { checkTargetName: "check:policy" },
    },
  ],
  hook: {
    _habitat: { identity: "@habitat-ai/cli:agent-stop", revision: 1 },
    hooks: [
      {
        type: "command",
        command: "bunx --bun --no-install --package @habitat-ai/cli habitat hook agent-stop",
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
  readonly check?: string;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly gitHook?: string;
  readonly nxPlugins?: readonly unknown[];
  readonly optionalDependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
  readonly prepare?: string;
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
    ...(input?.dependencies === undefined ? {} : { dependencies: input.dependencies }),
    ...(input?.prepare === undefined && input?.check === undefined
      ? {}
      : {
          scripts: {
            ...(input?.check === undefined ? {} : { check: input.check }),
            ...(input?.prepare === undefined ? {} : { prepare: input.prepare }),
          },
        }),
    ...(input?.devDependencies === undefined ? {} : { devDependencies: input.devDependencies }),
    ...(input?.optionalDependencies === undefined
      ? {}
      : { optionalDependencies: input.optionalDependencies }),
    ...(input?.peerDependencies === undefined ? {} : { peerDependencies: input.peerDependencies }),
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
  if (input?.gitHook !== undefined) tree.write(binding.gitHook.path, input.gitHook);
  return tree;
}

describe("Habitat Nx consumer initialization", () => {
  it("adds exact package-owned contributions while preserving consumer configuration", () => {
    const tree = consumerTree();

    expect(initializeHabitatConsumer(tree, binding)).toEqual({ packageChanged: true });

    expect(readJson(tree, "nx.json")).toMatchObject({
      plugins: ["unrelated-plugin", "@habitat-ai/cli/nx-plugin"],
    });
    expect(readJson(tree, "package.json")).toMatchObject({
      name: "consumer",
      scripts: { check: "nx run-many -t check", prepare: "husky" },
      devDependencies: { husky: "9.1.7" },
      trustedDependencies: ["unrelated-native-package", "@getgrit/cli"],
    });
    expect(tree.read(binding.gitHook.path, "utf8")).toBe(binding.gitHook.contents);
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

  it("preserves a consumer-owned Git hook", () => {
    const consumerHook = "bun run consumer-pre-push\n";
    const tree = consumerTree({ gitHook: consumerHook });

    initializeHabitatConsumer(tree, binding);

    expect(tree.read(binding.gitHook.path, "utf8")).toBe(consumerHook);
  });

  it("replaces the exact root bootstrap predecessor in place and repeats byte-stably", () => {
    const tree = consumerTree({
      nxPlugins: ["before", binding.predecessorNxPlugins[0], "after"],
      stop: [
        { hooks: [{ type: "command", command: "echo before" }] },
        binding.predecessorHooks[0],
        { hooks: [{ type: "command", command: "echo after" }] },
      ],
      trustedDependencies: ["@getgrit/cli"],
      check: "nx run-many -t check",
      devDependencies: { husky: "9.1.7" },
      prepare: "husky",
    });

    expect(initializeHabitatConsumer(tree, binding)).toEqual({ packageChanged: false });
    expect(readJson<{ readonly plugins: readonly unknown[] }>(tree, "nx.json").plugins).toEqual([
      "before",
      "@habitat-ai/cli/nx-plugin",
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

    const nxAfterFirst = tree.read("nx.json");
    const changesAfterFirst = tree.listChanges();
    const write = vi.spyOn(tree, "write");

    expect(initializeHabitatConsumer(tree, binding)).toEqual({ packageChanged: false });
    expect(write).not.toHaveBeenCalled();
    expect(tree.read("nx.json")).toEqual(nxAfterFirst);
    expect(tree.listChanges()).toEqual(changesAfterFirst);
  });

  it.each(
    binding.husky.predecessorPrepareScripts
  )("replaces the exact predecessor prepare script %s", (prepare) => {
    const tree = consumerTree({ prepare });

    initializeHabitatConsumer(tree, binding);

    expect(
      readJson<{ readonly scripts: { readonly prepare: string } }>(tree, "package.json")
    ).toMatchObject({ scripts: { prepare: "husky" } });
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
          nxPlugins: ["@habitat-ai/cli/nx-plugin", "@habitat-ai/cli/nx-plugin"],
        }),
      message: "multiple Habitat Nx plugin registrations",
    },
    {
      label: "unknown Nx registration",
      tree: () =>
        consumerTree({
          nxPlugins: [{ plugin: "@habitat-ai/cli/nx-plugin", options: { unsupported: true } }],
        }),
      message: "incompatible Habitat Nx plugin registration",
    },
    {
      label: "drifted predecessor Nx registration",
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
    {
      label: "incompatible Husky version",
      tree: () => consumerTree({ devDependencies: { husky: "8.0.0" } }),
      message: "incompatible husky version",
    },
    ...(["dependencies", "optionalDependencies", "peerDependencies"] as const).map((bucket) => ({
      label: `Husky in ${bucket}`,
      tree: () => consumerTree({ [bucket]: { husky: "9.1.7" } }),
      message: `only in devDependencies; found ${bucket}`,
    })),
    {
      label: "incompatible prepare script",
      tree: () => consumerTree({ prepare: "consumer-prepare" }),
      message: "incompatible prepare script",
    },
    {
      label: "empty check script",
      tree: () => consumerTree({ check: "" }),
      message: "empty check script",
    },
    {
      label: "empty Git hook",
      tree: () => consumerTree({ gitHook: "" }),
      message: ".husky/pre-push is empty",
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
      plugins: ["unrelated-plugin", "@habitat-ai/cli/nx-plugin"],
    });
    expect(readJson(tree, "package.json")).toMatchObject({
      scripts: { check: "nx run-many -t check", prepare: "husky" },
      devDependencies: { husky: "9.1.7" },
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
