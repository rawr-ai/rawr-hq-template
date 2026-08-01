import type { Client } from "@habitat/service/client";
import type { CreateNodesFunction, CreateNodesResultArray } from "@nx/devkit";
import { describe, expect, it, vi } from "vitest";
import {
  createHabitatNxPlugin,
  type HabitatClientForWorkspace,
  type HabitatNxBinding,
} from "../src";

type ResolveCatalogResult = Awaited<ReturnType<Client["catalog"]["resolve"]>>;
type ResolvedCatalog = Extract<ResolveCatalogResult, { _tag: "Resolved" }>["catalog"];
type ResolvedApplication = ResolvedCatalog["applications"][number];
type ResolvedInstance = ResolvedCatalog["instances"][number];

const provenance: ResolvedApplication["provenance"] = {
  kind: "local",
  authorityRoot: "/workspace/.habitat",
  relativePath: ".habitat/blueprints/service/blueprint.toml",
};

const serviceInstance: ResolvedInstance = {
  id: "service-a",
  ownerProject: "service-a",
  blueprint: "service",
  blueprintVersion: 1,
  manifestPath: "services/a/habitat.toml",
  roots: [{ id: "project", required: true, kind: "directory", path: "services/a" }],
  selections: [],
};

const pluginInstance: ResolvedInstance = {
  id: "@scope/plugin-b",
  ownerProject: "plugin-b",
  blueprint: "plugin",
  blueprintVersion: 1,
  manifestPath: "plugins/b/habitat.toml",
  roots: [{ id: "project", required: true, kind: "directory", path: "plugins/b" }],
  selections: [],
};

const gritApplication: ResolvedApplication = {
  ownerProject: "service-a",
  instanceId: "service-a",
  blueprint: "service",
  blueprintVersion: 1,
  ruleId: "source-law",
  manifestPath: "services/a/habitat.toml",
  lane: "enforced",
  message: "Service source must satisfy its law.",
  remediate: null,
  provenance,
  runner: {
    name: "grit",
    pattern: {
      provenance,
      relativePath: ".habitat/blueprints/service/source-law/pattern.md",
      absolutePath: "/workspace/.habitat/blueprints/service/source-law/pattern.md",
    },
    patternName: "source_law",
    acquisition: {
      kind: "check",
      entries: [
        {
          source: { kind: "root-role", id: "project" },
          kind: "directory",
          path: "services/a/src",
        },
      ],
    },
  },
};

const structureApplication: ResolvedApplication = {
  ownerProject: "plugin-b",
  instanceId: "@scope/plugin-b",
  blueprint: "plugin",
  blueprintVersion: 1,
  ruleId: "plugin-structure",
  manifestPath: "plugins/b/habitat.toml",
  lane: "enforced",
  message: "Plugin structure must remain closed.",
  remediate: "Restore the plugin structure.",
  provenance: { ...provenance, relativePath: ".habitat/blueprints/plugin/blueprint.toml" },
  runner: {
    name: "habitat",
    mode: "structure",
    structure: {
      provenance,
      relativePath: ".habitat/blueprints/plugin/structure.toml",
      absolutePath: "/workspace/.habitat/blueprints/plugin/structure.toml",
    },
    rootBindings: [
      {
        rootRole: "project",
        required: true,
        kind: "directory",
        path: "plugins/b",
      },
      {
        rootRole: "manifest",
        required: true,
        kind: "file",
        path: "plugins/b/habitat.toml",
      },
    ],
  },
};

const configFiles = [
  ".habitat/blueprints/plugin/blueprint.toml",
  ".habitat/blueprints/service/blueprint.toml",
  "plugins/b/habitat.toml",
  "services/a/habitat.toml",
];

function resolvedCatalog(
  applications: ResolvedApplication[] = [gritApplication, structureApplication],
  instances: ResolvedInstance[] = [serviceInstance, pluginInstance]
): ResolveCatalogResult {
  return {
    _tag: "Resolved",
    catalog: {
      schemaVersion: 3,
      policyPack: {
        name: "@habitat/blueprints",
        version: "0.2.0",
        protocolVersion: 1,
        blueprints: [],
      },
      blueprints: [],
      instances,
      applications,
      compatibility: { schemaVersion: 2, ownerRoots: {}, rules: [] },
    },
  };
}

const runtimeInputs: HabitatNxBinding["runtimeInputs"] = [
  { externalDependencies: ["@habitat/cli"] },
  "{workspaceRoot}/bun.lock",
  "{workspaceRoot}/package.json",
  { env: "HABITAT_COMMAND_TIMEOUT_MS" },
];

function createHandler(
  clientForWorkspace: HabitatClientForWorkspace
): CreateNodesFunction<undefined> {
  const plugin = createHabitatNxPlugin({ clientForWorkspace, runtimeInputs });
  expect("name" in plugin).toBe(false);
  expect(plugin.createNodes[0]).toBe(
    "{.habitat/blueprints/*/blueprint.toml,.habitat/index.json,.habitat/**/rule.json,**/habitat.toml}"
  );
  return plugin.createNodes[1];
}

function projectMap(result: CreateNodesResultArray) {
  return Object.fromEntries(
    result.flatMap(([, projected]) => Object.entries(projected.projects ?? {}))
  );
}

describe("Habitat Nx projection", () => {
  it("projects stable application leaves and owner-only aggregates", async () => {
    const resolve = vi.fn(async () => resolvedCatalog());
    const clientForWorkspace = vi.fn(() => ({ catalog: { resolve } }));
    const createNodes = createHandler(clientForWorkspace);

    const first = await createNodes([...configFiles].reverse(), undefined, {
      workspaceRoot: "/first/workspace",
      nxJsonConfiguration: {},
    });
    const second = await createNodes(configFiles, undefined, {
      workspaceRoot: "/second/workspace",
      nxJsonConfiguration: {},
    });

    expect(first).toEqual(second);
    expect(JSON.stringify(first)).not.toContain("/workspace");
    expect(first.map(([source]) => source)).toEqual([
      "plugins/b/habitat.toml",
      "services/a/habitat.toml",
    ]);
    expect(clientForWorkspace.mock.calls).toEqual([["/first/workspace"], ["/second/workspace"]]);
    expect(resolve).toHaveBeenCalledTimes(2);
    expect(resolve).toHaveBeenNthCalledWith(1, {});
    expect(resolve).toHaveBeenNthCalledWith(2, {});

    const projects = projectMap(first);
    expect(projects["services/a"]?.name).toBeUndefined();
    const serviceTargets = projects["services/a"]?.targets;
    expect(Object.keys(serviceTargets ?? {})).toEqual([
      "check:policy",
      "habitat:application:service-a:source-law",
    ]);
    const serviceLeaf = serviceTargets?.["habitat:application:service-a:source-law"];
    expect(serviceLeaf).toMatchObject({
      command: "habitat check --instance service-a --rule source-law",
      cache: true,
      outputs: [],
      options: { cwd: "{workspaceRoot}" },
    });
    expect(serviceLeaf?.command).not.toContain("nx");
    expect(serviceLeaf?.inputs).toEqual([
      { externalDependencies: ["@habitat/cli"] },
      "{workspaceRoot}/bun.lock",
      "{workspaceRoot}/package.json",
      { env: "HABITAT_COMMAND_TIMEOUT_MS" },
      "{workspaceRoot}/**/habitat.toml",
      "{workspaceRoot}/.habitat/**/rule.json",
      "{workspaceRoot}/.habitat/blueprints/*/blueprint.toml",
      "{workspaceRoot}/.habitat/blueprints/service/source-law/pattern.md",
      "{workspaceRoot}/.habitat/index.json",
      "{workspaceRoot}/services/a/src",
      "{workspaceRoot}/services/a/src/**/*",
    ]);
    expect(serviceLeaf?.inputs).not.toContain(
      "{workspaceRoot}/.habitat/blueprints/plugin/structure.toml"
    );
    expect(serviceTargets?.["check:policy"]).toMatchObject({
      executor: "nx:noop",
      cache: false,
      outputs: [],
      dependsOn: [
        {
          target: "habitat:application:service-a:source-law",
        },
      ],
    });

    const pluginTargets = projects["plugins/b"]?.targets;
    const structureLeaf = pluginTargets?.["habitat:application:@scope/plugin-b:plugin-structure"];
    expect(structureLeaf?.inputs).toEqual([
      { externalDependencies: ["@habitat/cli"] },
      "{workspaceRoot}/bun.lock",
      "{workspaceRoot}/package.json",
      { env: "HABITAT_COMMAND_TIMEOUT_MS" },
      "{workspaceRoot}/**/habitat.toml",
      "{workspaceRoot}/.habitat/**/rule.json",
      "{workspaceRoot}/.habitat/blueprints/*/blueprint.toml",
      "{workspaceRoot}/.habitat/blueprints/plugin/structure.toml",
      "{workspaceRoot}/.habitat/index.json",
      "{workspaceRoot}/plugins/b",
      "{workspaceRoot}/plugins/b/**/*",
      "{workspaceRoot}/plugins/b/habitat.toml",
    ]);
  });

  it("keeps same-rule instances unique and sorts aggregate dependencies", async () => {
    if (gritApplication.runner.name !== "grit") {
      throw new Error("Expected the Grit application fixture.");
    }
    const otherInstance: ResolvedInstance = {
      ...serviceInstance,
      id: "service-c",
      ownerProject: "service-c",
      manifestPath: "services/c/habitat.toml",
      roots: [{ id: "project", required: true, kind: "directory", path: "services/c" }],
    };
    const otherApplication: ResolvedApplication = {
      ...gritApplication,
      ownerProject: "service-c",
      instanceId: "service-c",
      manifestPath: "services/c/habitat.toml",
      runner: {
        ...gritApplication.runner,
        acquisition: {
          ...gritApplication.runner.acquisition,
          entries: [
            {
              source: { kind: "root-role", id: "project" },
              kind: "directory",
              path: "services/c/src",
            },
          ],
        },
      },
    };
    const earlierRule = { ...gritApplication, ruleId: "a-rule" };
    const createNodes = createHandler(() => ({
      catalog: {
        resolve: async () =>
          resolvedCatalog(
            [gritApplication, earlierRule, otherApplication],
            [serviceInstance, otherInstance]
          ),
      },
    }));

    const result = await createNodes([...configFiles, "services/c/habitat.toml"], undefined, {
      workspaceRoot: "/workspace",
      nxJsonConfiguration: {},
    });
    const projects = projectMap(result);
    expect(
      projects["services/c"]?.targets?.["habitat:application:service-c:source-law"]
    ).toBeDefined();
    expect(projects["services/a"]?.targets?.["check:policy"]?.dependsOn).toEqual([
      { target: "habitat:application:service-a:a-rule" },
      { target: "habitat:application:service-a:source-law" },
    ]);
  });

  it("returns no project identity when the resolved application set is empty", async () => {
    const resolve = vi.fn(async () => resolvedCatalog([]));
    const clientForWorkspace = vi.fn(() => ({ catalog: { resolve } }));
    const createNodes = createHandler(clientForWorkspace);

    await expect(
      createNodes(configFiles, undefined, {
        workspaceRoot: "/workspace",
        nxJsonConfiguration: {},
      })
    ).resolves.toEqual([]);
    expect(clientForWorkspace).toHaveBeenCalledTimes(1);
    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it("fails graph construction with the complete rejected issue payload", async () => {
    const createNodes = createHandler(() => ({
      catalog: {
        resolve: async () => ({
          _tag: "Rejected",
          issues: [
            {
              code: "authority-manifest-invalid",
              path: "services/a/habitat.toml",
              message: "Invalid manifest.",
            },
          ],
        }),
      },
    }));

    await expect(
      createNodes(configFiles, undefined, {
        workspaceRoot: "/workspace",
        nxJsonConfiguration: {},
      })
    ).rejects.toThrow(
      '[{"code":"authority-manifest-invalid","path":"services/a/habitat.toml","message":"Invalid manifest."}]'
    );
  });

  it("refuses missing or inconsistent application lineage atomically", async () => {
    const cases: readonly [string, ResolveCatalogResult, readonly string[]][] = [
      [
        "instance 'service-a' is absent",
        resolvedCatalog([gritApplication], [pluginInstance]),
        configFiles,
      ],
      [
        "owner 'other-owner' does not match 'service-a'",
        resolvedCatalog([{ ...gritApplication, ownerProject: "other-owner" }]),
        configFiles,
      ],
      [
        "blueprint 'other' does not match 'service'",
        resolvedCatalog([{ ...gritApplication, blueprint: "other" }]),
        configFiles,
      ],
      [
        "blueprint version '2' does not match '1'",
        resolvedCatalog([{ ...gritApplication, blueprintVersion: 2 }]),
        configFiles,
      ],
      [
        "manifest 'services/other/habitat.toml' does not match 'services/a/habitat.toml'",
        resolvedCatalog([{ ...gritApplication, manifestPath: "services/other/habitat.toml" }]),
        [...configFiles, "services/other/habitat.toml"],
      ],
      [
        "manifest 'services/a/habitat.toml' is outside the matched authority files",
        resolvedCatalog([gritApplication]),
        configFiles.filter((file) => file !== "services/a/habitat.toml"),
      ],
      [
        "duplicate target 'service-a:habitat:application:service-a:source-law'",
        resolvedCatalog([gritApplication, gritApplication]),
        configFiles,
      ],
      [
        "duplicate instance 'service-a'",
        resolvedCatalog([gritApplication], [serviceInstance, serviceInstance]),
        configFiles,
      ],
      [
        "owner 'service-a': roots 'services/a' and 'services/c' collide",
        resolvedCatalog(
          [
            gritApplication,
            {
              ...gritApplication,
              instanceId: "service-c",
              manifestPath: "services/c/habitat.toml",
            },
          ],
          [
            serviceInstance,
            {
              ...serviceInstance,
              id: "service-c",
              manifestPath: "services/c/habitat.toml",
              roots: [{ id: "project", required: true, kind: "directory", path: "services/c" }],
            },
          ]
        ),
        [...configFiles, "services/c/habitat.toml"],
      ],
    ];

    for (const [message, result, files] of cases) {
      const createNodes = createHandler(() => ({
        catalog: { resolve: async () => result },
      }));
      await expect(
        createNodes(files, undefined, {
          workspaceRoot: "/workspace",
          nxJsonConfiguration: {},
        })
      ).rejects.toThrow(message);
    }
  });

  it("replaces prior targets when a later resolution changes", async () => {
    const resolve = vi
      .fn()
      .mockResolvedValueOnce(resolvedCatalog([gritApplication]))
      .mockResolvedValueOnce(resolvedCatalog([structureApplication]));
    const createNodes = createHandler(() => ({ catalog: { resolve } }));
    const context = { workspaceRoot: "/workspace", nxJsonConfiguration: {} };

    const first = projectMap(await createNodes(configFiles, undefined, context));
    const second = projectMap(await createNodes(configFiles, undefined, context));

    expect(Object.keys(first)).toEqual(["services/a"]);
    expect(Object.keys(second)).toEqual(["plugins/b"]);
  });
});
