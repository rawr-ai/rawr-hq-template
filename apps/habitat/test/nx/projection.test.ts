import type { HabitatClient } from "@habitat-ai/sdk";
import type { CreateNodesFunction, CreateNodesResultArray } from "@nx/devkit";
import { describe, expect, it, vi } from "vitest";
import {
  createHabitatNxPlugin,
  type HabitatClientForWorkspace,
  type HabitatNxBinding,
} from "../../src/nx/projection";

type ResolveCatalogResult = Awaited<ReturnType<HabitatClient["catalog"]["resolve"]>>;
type ResolvedCatalog = Extract<ResolveCatalogResult, { _tag: "Resolved" }>["catalog"];
type ResolvedApplication = ResolvedCatalog["applications"][number];
type ResolvedGritApplication = ResolvedApplication & {
  readonly runner: Extract<ResolvedApplication["runner"], { name: "grit" }>;
};
type ResolvedInstance = ResolvedCatalog["instances"][number];
type CompatibilityCatalog = ResolvedCatalog["compatibility"];
type CompatibilityRule = CompatibilityCatalog["rules"][number];

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

const gritApplication: ResolvedGritApplication = {
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

const rootPatternApplication: ResolvedApplication = {
  ...gritApplication,
  ruleId: "root-pattern-law",
  runner: {
    ...gritApplication.runner,
    acquisition: {
      kind: "check",
      entries: [
        {
          source: { kind: "root-pattern", id: "project", pattern: "package.json" },
          kind: "file",
          path: "services/a/package.json",
        },
        {
          source: { kind: "root-pattern", id: "project", pattern: "src/**/*.ts" },
          kind: "file",
          path: "services/a/src/**/*.ts",
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

const policyPackProvenance: Extract<ResolvedApplication["provenance"], { kind: "policy-pack" }> = {
  kind: "policy-pack",
  packageName: "@habitat-ai/sdk",
  packageVersion: "0.5.0",
  packageRoot: "/workspace/node_modules/@habitat-ai/sdk",
  packageRelativePath: "dist/blueprints/package/blueprint.toml",
};

const packagedInstance: ResolvedInstance = {
  id: "installed-package",
  ownerProject: "@fixture/package",
  blueprint: "package",
  blueprintVersion: 1,
  manifestPath: "packages/example/habitat.toml",
  roots: [{ id: "project", required: true, kind: "directory", path: "packages/example" }],
  selections: [],
};

const packagedStructureApplication: ResolvedApplication = {
  ownerProject: "@fixture/package",
  instanceId: "installed-package",
  blueprint: "package",
  blueprintVersion: 1,
  ruleId: "package_v1_structure",
  manifestPath: "packages/example/habitat.toml",
  lane: "enforced",
  message: "Package projects must preserve the closed reusable-support shell.",
  remediate: "Restore the package project shell.",
  provenance: policyPackProvenance,
  runner: {
    name: "habitat",
    mode: "structure",
    structure: {
      provenance: {
        ...policyPackProvenance,
        packageRelativePath: "dist/blueprints/package/structure.toml",
      },
      relativePath: "dist/blueprints/package/structure.toml",
      absolutePath:
        "/workspace/node_modules/@habitat-ai/sdk/dist/blueprints/package/structure.toml",
    },
    rootBindings: [
      {
        rootRole: "project",
        required: true,
        kind: "directory",
        path: "packages/example",
      },
    ],
  },
};

const compatibilityProvenance: CompatibilityRule["provenance"] = {
  kind: "local",
  authorityRoot: "/workspace",
  relativePath: ".habitat/blueprints/legacy/source-compat/rule.json",
};

const gritCompatibilityRule: CompatibilityRule = {
  ruleId: "source-compat",
  ownerProject: "service-a",
  manifestPath: ".habitat/blueprints/legacy/source-compat/rule.json",
  lane: "enforced",
  message: "Legacy service source must satisfy its law.",
  remediate: "Restore the legacy source law.",
  provenance: compatibilityProvenance,
  coveragePatterns: ["services/a/src/**/*.ts", "services/a/package.json"],
  baseline: {
    provenance: compatibilityProvenance,
    relativePath: ".habitat/blueprints/legacy/source-compat/baseline.json",
    absolutePath: "/workspace/.habitat/blueprints/legacy/source-compat/baseline.json",
  },
  runner: {
    name: "grit",
    pattern: {
      provenance: compatibilityProvenance,
      relativePath: ".habitat/blueprints/legacy/source-compat/pattern.md",
      absolutePath: "/workspace/.habitat/blueprints/legacy/source-compat/pattern.md",
    },
    patternName: "source_compat",
    acquisition: {
      kind: "check",
      entries: [{ kind: "directory", path: "services/a" }],
    },
  },
};

const structureCompatibilityRule: CompatibilityRule = {
  ruleId: "plugin-compat",
  ownerProject: "plugin-b",
  manifestPath: ".habitat/blueprints/legacy/plugin-compat/rule.json",
  lane: "enforced",
  message: "Legacy plugin structure must remain closed.",
  remediate: "Restore the legacy plugin structure.",
  provenance: {
    ...compatibilityProvenance,
    relativePath: ".habitat/blueprints/legacy/plugin-compat/rule.json",
  },
  coveragePatterns: ["plugins/b/**/*.ts"],
  baseline: {
    provenance: compatibilityProvenance,
    relativePath: ".habitat/blueprints/legacy/plugin-compat/baseline.json",
    absolutePath: "/workspace/.habitat/blueprints/legacy/plugin-compat/baseline.json",
  },
  runner: {
    name: "habitat",
    mode: "structure",
    structure: {
      provenance: compatibilityProvenance,
      relativePath: ".habitat/blueprints/legacy/plugin-compat/structure.toml",
      absolutePath: "/workspace/.habitat/blueprints/legacy/plugin-compat/structure.toml",
    },
  },
};

const compatibilityConfigFiles = [
  ".habitat/index.json",
  gritCompatibilityRule.manifestPath,
  structureCompatibilityRule.manifestPath,
];

function compatibilityCatalog(
  rules: CompatibilityRule[] = [gritCompatibilityRule, structureCompatibilityRule],
  ownerRoots: CompatibilityCatalog["ownerRoots"] = {
    "plugin-b": "plugins/b",
    "service-a": "services/a",
  }
): CompatibilityCatalog {
  return { schemaVersion: 2, ownerRoots, rules };
}

const configFiles = [
  ".habitat/blueprints/plugin/blueprint.toml",
  ".habitat/blueprints/service/blueprint.toml",
  "plugins/b/habitat.toml",
  "services/a/habitat.toml",
];

function resolvedCatalog(
  applications: ResolvedApplication[] = [gritApplication, structureApplication],
  instances: ResolvedInstance[] = [serviceInstance, pluginInstance],
  compatibility: CompatibilityCatalog = compatibilityCatalog([], {})
): ResolveCatalogResult {
  return {
    _tag: "Resolved",
    catalog: {
      schemaVersion: 3,
      policyPack: {
        name: "@habitat-ai/sdk",
        version: "0.3.1",
        protocolVersion: 1,
        blueprints: [],
      },
      blueprints: [],
      instances,
      applications,
      compatibility,
    },
  };
}

const runtimeInputs: HabitatNxBinding["runtimeInputs"] = [
  { externalDependencies: ["@habitat-ai/cli"] },
  "{workspaceRoot}/bun.lock",
  "{workspaceRoot}/package.json",
  { env: "HABITAT_COMMAND_TIMEOUT_MS" },
  { env: "NX_WORKSPACE_ROOT_PATH" },
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
  it("projects stable focused leaves and one cacheable native owner check", async () => {
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
      parallelism: false,
      outputs: [],
      options: { cwd: "{workspaceRoot}" },
    });
    expect(serviceLeaf?.command).not.toContain("nx");
    expect(serviceLeaf?.inputs).toEqual([
      { externalDependencies: ["@habitat-ai/cli"] },
      "{workspaceRoot}/bun.lock",
      "{workspaceRoot}/package.json",
      { env: "HABITAT_COMMAND_TIMEOUT_MS" },
      { env: "NX_WORKSPACE_ROOT_PATH" },
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
    expect(serviceTargets?.["check:policy"]).toEqual({
      command: "habitat check --owner service-a",
      cache: true,
      parallelism: false,
      inputs: serviceLeaf?.inputs,
      outputs: [],
      options: { cwd: "{workspaceRoot}" },
      metadata: { description: "Check resolved Habitat applications owned by service-a" },
    });

    const pluginTargets = projects["plugins/b"]?.targets;
    const structureLeaf = pluginTargets?.["habitat:application:@scope/plugin-b:plugin-structure"];
    expect(structureLeaf?.inputs).toEqual([
      { externalDependencies: ["@habitat-ai/cli"] },
      "{workspaceRoot}/bun.lock",
      "{workspaceRoot}/package.json",
      { env: "HABITAT_COMMAND_TIMEOUT_MS" },
      { env: "NX_WORKSPACE_ROOT_PATH" },
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

  it("hashes package authority through public dependencies without projecting package assets", async () => {
    const createNodes = createHandler(() => ({
      catalog: {
        resolve: async () =>
          resolvedCatalog(
            [gritApplication, packagedStructureApplication],
            [serviceInstance, packagedInstance]
          ),
      },
    }));

    const result = await createNodes(
      [
        ".habitat/blueprints/service/blueprint.toml",
        serviceInstance.manifestPath,
        packagedInstance.manifestPath,
      ],
      undefined,
      { workspaceRoot: "/workspace", nxJsonConfiguration: {} }
    );
    const projects = projectMap(result);
    const localInputs =
      projects["services/a"]?.targets?.["habitat:application:service-a:source-law"]?.inputs;
    const packageInputs =
      projects["packages/example"]?.targets?.[
        "habitat:application:installed-package:package_v1_structure"
      ]?.inputs;

    expect(localInputs).toContain(
      "{workspaceRoot}/.habitat/blueprints/service/source-law/pattern.md"
    );
    expect(packageInputs).toEqual([
      ...runtimeInputs,
      "{workspaceRoot}/**/habitat.toml",
      "{workspaceRoot}/.habitat/**/rule.json",
      "{workspaceRoot}/.habitat/blueprints/*/blueprint.toml",
      "{workspaceRoot}/.habitat/index.json",
      "{workspaceRoot}/packages/example",
      "{workspaceRoot}/packages/example/**/*",
    ]);
    expect(packageInputs).not.toContain("{workspaceRoot}/dist/blueprints/package/structure.toml");
    expect(JSON.stringify(projects["packages/example"])).not.toContain(
      policyPackProvenance.packageRoot
    );
  });

  it("projects automatically bound root patterns exactly without manifest member configuration", async () => {
    expect(serviceInstance.selections).toEqual([]);
    const createNodes = createHandler(() => ({
      catalog: {
        resolve: async () => resolvedCatalog([rootPatternApplication], [serviceInstance]),
      },
    }));

    const result = await createNodes(configFiles, undefined, {
      workspaceRoot: "/workspace",
      nxJsonConfiguration: {},
    });
    const targets = projectMap(result)["services/a"]?.targets;
    const leaf = targets?.["habitat:application:service-a:root-pattern-law"];

    expect(leaf).toMatchObject({
      command: "habitat check --instance service-a --rule root-pattern-law",
      cache: true,
      parallelism: false,
    });
    expect(leaf?.inputs).toEqual([
      ...runtimeInputs,
      "{workspaceRoot}/**/habitat.toml",
      "{workspaceRoot}/.habitat/**/rule.json",
      "{workspaceRoot}/.habitat/blueprints/*/blueprint.toml",
      "{workspaceRoot}/.habitat/blueprints/service/source-law/pattern.md",
      "{workspaceRoot}/.habitat/index.json",
      "{workspaceRoot}/services/a/package.json",
      "{workspaceRoot}/services/a/src/**/*.ts",
    ]);
    expect(leaf?.inputs).not.toContain("{workspaceRoot}/services/a");
    expect(leaf?.inputs).not.toContain("{workspaceRoot}/services/a/**/*");
    expect(leaf?.inputs).not.toContain("{workspaceRoot}/**/*");
    expect(targets?.["check:policy"]?.inputs).toEqual(leaf?.inputs);
    expect(targets?.["check:policy"]?.parallelism).toBe(false);
  });

  it("projects compatibility-only Grit and structure leaves on exact owner roots", async () => {
    const resolve = vi.fn(async () => resolvedCatalog([], [], compatibilityCatalog()));
    const createNodes = createHandler(() => ({ catalog: { resolve } }));

    const first = await createNodes([...compatibilityConfigFiles].reverse(), undefined, {
      workspaceRoot: "/first/workspace",
      nxJsonConfiguration: {},
    });
    const second = await createNodes(compatibilityConfigFiles, undefined, {
      workspaceRoot: "/second/workspace",
      nxJsonConfiguration: {},
    });

    expect(first).toEqual(second);
    expect(resolve).toHaveBeenCalledTimes(2);
    expect(first.map(([source]) => source)).toEqual([
      structureCompatibilityRule.manifestPath,
      gritCompatibilityRule.manifestPath,
    ]);

    const projects = projectMap(first);
    expect(Object.keys(projects)).toEqual(["plugins/b", "services/a"]);
    expect(projects["services/a"]?.name).toBeUndefined();

    const gritTargets = projects["services/a"]?.targets;
    expect(Object.keys(gritTargets ?? {})).toEqual(["check:policy", "habitat:rule:source-compat"]);
    const gritLeaf = gritTargets?.["habitat:rule:source-compat"];
    expect(gritLeaf).toMatchObject({
      command: "habitat check --rule source-compat",
      cache: true,
      parallelism: false,
      outputs: [],
      options: { cwd: "{workspaceRoot}" },
    });
    expect(gritLeaf?.command).not.toContain("--instance");
    expect(gritLeaf?.inputs).toEqual([
      { externalDependencies: ["@habitat-ai/cli"] },
      "{workspaceRoot}/bun.lock",
      "{workspaceRoot}/package.json",
      { env: "HABITAT_COMMAND_TIMEOUT_MS" },
      { env: "NX_WORKSPACE_ROOT_PATH" },
      "{workspaceRoot}/**/habitat.toml",
      "{workspaceRoot}/.habitat/**",
      "{workspaceRoot}/.habitat/**/rule.json",
      "{workspaceRoot}/.habitat/blueprints/*/blueprint.toml",
      "{workspaceRoot}/.habitat/blueprints/legacy/source-compat/baseline.json",
      "{workspaceRoot}/.habitat/blueprints/legacy/source-compat/pattern.md",
      "{workspaceRoot}/.habitat/blueprints/legacy/source-compat/rule.json",
      "{workspaceRoot}/.habitat/index.json",
      "{workspaceRoot}/services/a",
      "{workspaceRoot}/services/a/**/*",
      "{workspaceRoot}/services/a/package.json",
      "{workspaceRoot}/services/a/src/**/*.ts",
    ]);
    expect(gritTargets?.["check:policy"]).toMatchObject({
      command: "habitat check --owner service-a",
      cache: true,
      parallelism: false,
      inputs: gritLeaf?.inputs,
      outputs: [],
      options: { cwd: "{workspaceRoot}" },
    });
    expect(gritTargets?.["check:policy"]?.dependsOn).toBeUndefined();

    const structureTargets = projects["plugins/b"]?.targets;
    expect(Object.keys(structureTargets ?? {})).toEqual([
      "check:policy",
      "habitat:rule:plugin-compat",
    ]);
    const structureLeaf = structureTargets?.["habitat:rule:plugin-compat"];
    expect(structureLeaf).toMatchObject({
      command: "habitat check --rule plugin-compat",
      cache: true,
      parallelism: false,
      outputs: [],
      options: { cwd: "{workspaceRoot}" },
    });
    expect(structureLeaf?.inputs).toEqual([
      { externalDependencies: ["@habitat-ai/cli"] },
      "{workspaceRoot}/bun.lock",
      "{workspaceRoot}/package.json",
      { env: "HABITAT_COMMAND_TIMEOUT_MS" },
      { env: "NX_WORKSPACE_ROOT_PATH" },
      "{workspaceRoot}/**/habitat.toml",
      "{workspaceRoot}/.habitat/**",
      "{workspaceRoot}/.habitat/**/rule.json",
      "{workspaceRoot}/.habitat/blueprints/*/blueprint.toml",
      "{workspaceRoot}/.habitat/blueprints/legacy/plugin-compat/baseline.json",
      "{workspaceRoot}/.habitat/blueprints/legacy/plugin-compat/rule.json",
      "{workspaceRoot}/.habitat/blueprints/legacy/plugin-compat/structure.toml",
      "{workspaceRoot}/.habitat/index.json",
      "{workspaceRoot}/plugins/b/**/*.ts",
    ]);
    expect(structureTargets?.["check:policy"]).toMatchObject({
      command: "habitat check --owner plugin-b",
      cache: true,
      parallelism: false,
      inputs: structureLeaf?.inputs,
      outputs: [],
      options: { cwd: "{workspaceRoot}" },
    });
    expect(structureTargets?.["check:policy"]?.dependsOn).toBeUndefined();
  });

  it("unions compatibility and application inputs into one owner command", async () => {
    const createNodes = createHandler(() => ({
      catalog: {
        resolve: async () =>
          resolvedCatalog(
            [gritApplication],
            [serviceInstance],
            compatibilityCatalog([gritCompatibilityRule], { "service-a": "services/a" })
          ),
      },
    }));

    const result = await createNodes([...configFiles, ...compatibilityConfigFiles], undefined, {
      workspaceRoot: "/workspace",
      nxJsonConfiguration: {},
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.[0]).toBe("services/a/habitat.toml");
    const service = projectMap(result)["services/a"];
    expect(Object.keys(service?.targets ?? {})).toEqual([
      "check:policy",
      "habitat:application:service-a:source-law",
      "habitat:rule:source-compat",
    ]);
    const owner = service?.targets?.["check:policy"];
    expect(owner).toMatchObject({
      command: "habitat check --owner service-a",
      cache: true,
      outputs: [],
      options: { cwd: "{workspaceRoot}" },
    });
    expect(owner?.dependsOn).toBeUndefined();
    expect(owner?.inputs).toEqual([
      ...runtimeInputs,
      "{workspaceRoot}/**/habitat.toml",
      "{workspaceRoot}/.habitat/**",
      "{workspaceRoot}/.habitat/**/rule.json",
      "{workspaceRoot}/.habitat/blueprints/*/blueprint.toml",
      "{workspaceRoot}/.habitat/blueprints/legacy/source-compat/baseline.json",
      "{workspaceRoot}/.habitat/blueprints/legacy/source-compat/pattern.md",
      "{workspaceRoot}/.habitat/blueprints/legacy/source-compat/rule.json",
      "{workspaceRoot}/.habitat/blueprints/service/source-law/pattern.md",
      "{workspaceRoot}/.habitat/index.json",
      "{workspaceRoot}/services/a",
      "{workspaceRoot}/services/a/**/*",
      "{workspaceRoot}/services/a/package.json",
      "{workspaceRoot}/services/a/src",
      "{workspaceRoot}/services/a/src/**/*",
      "{workspaceRoot}/services/a/src/**/*.ts",
    ]);
  });

  it("uses declared compatibility coverage instead of recursively hashing the workspace", async () => {
    if (gritCompatibilityRule.runner.name !== "grit") {
      throw new Error("Expected the Grit compatibility fixture.");
    }
    const workspaceRule: CompatibilityRule = {
      ...gritCompatibilityRule,
      ownerProject: "workspace",
      manifestPath: ".habitat/workspace/rule.json",
      runner: {
        ...gritCompatibilityRule.runner,
        acquisition: { kind: "check", entries: [{ kind: "directory", path: "." }] },
      },
    };
    const createNodes = createHandler(() => ({
      catalog: {
        resolve: async () =>
          resolvedCatalog([], [], compatibilityCatalog([workspaceRule], { workspace: "." })),
      },
    }));

    const result = await createNodes(
      [".habitat/index.json", workspaceRule.manifestPath],
      undefined,
      {
        workspaceRoot: "/workspace",
        nxJsonConfiguration: {},
      }
    );
    const targets = projectMap(result)["."]?.targets;

    const focusedInputs = targets?.["habitat:rule:source-compat"]?.inputs;
    const ownerInputs = targets?.["check:policy"]?.inputs;

    expect(focusedInputs).toContain("{workspaceRoot}/services/a/src/**/*.ts");
    expect(focusedInputs).toContain("{workspaceRoot}/services/a/package.json");
    expect(focusedInputs).toContainEqual({ env: "NX_WORKSPACE_ROOT_PATH" });
    expect(focusedInputs).not.toContain("{workspaceRoot}/**/*");
    expect(focusedInputs).not.toContain("{workspaceRoot}");
    expect(ownerInputs).toEqual(focusedInputs);
  });

  it("keeps non-workspace compatibility directories recursively admitted", async () => {
    const createNodes = createHandler(() => ({
      catalog: {
        resolve: async () =>
          resolvedCatalog(
            [],
            [],
            compatibilityCatalog([gritCompatibilityRule], { "service-a": "services/a" })
          ),
      },
    }));

    const result = await createNodes(compatibilityConfigFiles, undefined, {
      workspaceRoot: "/workspace",
      nxJsonConfiguration: {},
    });
    const inputs =
      projectMap(result)["services/a"]?.targets?.["habitat:rule:source-compat"]?.inputs;

    expect(inputs).toContain("{workspaceRoot}/services/a");
    expect(inputs).toContain("{workspaceRoot}/services/a/**/*");
  });

  it("rejects an owner identity that cannot be one portable command argument", async () => {
    const ownerProject = "owner with 'quote; $(touch /tmp/habitat-projection-test)";
    const createNodes = createHandler(() => ({
      catalog: {
        resolve: async () =>
          resolvedCatalog(
            [{ ...gritApplication, ownerProject }],
            [{ ...serviceInstance, ownerProject }]
          ),
      },
    }));

    await expect(
      createNodes(configFiles, undefined, {
        workspaceRoot: "/workspace",
        nxJsonConfiguration: {},
      })
    ).rejects.toThrow("identity is not portable as an Nx command argument");
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
    expect(projects["services/a"]?.targets?.["check:policy"]).toMatchObject({
      command: "habitat check --owner service-a",
      cache: true,
    });
    expect(projects["services/a"]?.targets?.["check:policy"]?.dependsOn).toBeUndefined();
  });

  it("returns no project identity when both catalog generations are empty", async () => {
    const resolve = vi.fn(async () => resolvedCatalog([], []));
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

  it("refuses inconsistent compatibility owner, root, manifest, and target facts atomically", async () => {
    if (gritCompatibilityRule.runner.name !== "grit") {
      throw new Error("Expected the Grit compatibility fixture.");
    }
    const cases: readonly [string, ResolveCatalogResult, readonly string[]][] = [
      [
        "compatibility rule 'source-compat': owner 'service-a' has no root",
        resolvedCatalog([], [], compatibilityCatalog([gritCompatibilityRule], {})),
        compatibilityConfigFiles,
      ],
      [
        "compatibility rule 'source-compat': manifest '.habitat/blueprints/legacy/source-compat/rule.json' is outside the matched authority files",
        resolvedCatalog(
          [],
          [],
          compatibilityCatalog([gritCompatibilityRule], { "service-a": "services/a" })
        ),
        compatibilityConfigFiles.filter((file) => file !== gritCompatibilityRule.manifestPath),
      ],
      [
        "owner 'service-a': roots 'services/other' and 'services/a' collide",
        resolvedCatalog(
          [gritApplication],
          [serviceInstance],
          compatibilityCatalog([gritCompatibilityRule], { "service-a": "services/other" })
        ),
        [...configFiles, ...compatibilityConfigFiles],
      ],
      [
        "root 'services/a': owners 'plugin-b' and 'service-a' collide",
        resolvedCatalog(
          [],
          [],
          compatibilityCatalog([gritCompatibilityRule], {
            "plugin-b": "services/a",
            "service-a": "services/a",
          })
        ),
        compatibilityConfigFiles,
      ],
      [
        "path escapes the workspace: '../outside'",
        resolvedCatalog(
          [],
          [],
          compatibilityCatalog([gritCompatibilityRule], { "service-a": "../outside" })
        ),
        compatibilityConfigFiles,
      ],
      [
        "path escapes the workspace: '../outside/rule.json'",
        resolvedCatalog(
          [],
          [],
          compatibilityCatalog(
            [{ ...gritCompatibilityRule, manifestPath: "../outside/rule.json" }],
            { "service-a": "services/a" }
          )
        ),
        compatibilityConfigFiles,
      ],
      [
        "requires a workspace-relative path: '/outside/baseline.json'",
        resolvedCatalog(
          [],
          [],
          compatibilityCatalog(
            [
              {
                ...gritCompatibilityRule,
                baseline: {
                  ...gritCompatibilityRule.baseline,
                  relativePath: "/outside/baseline.json",
                },
              },
            ],
            { "service-a": "services/a" }
          )
        ),
        compatibilityConfigFiles,
      ],
      [
        "path escapes the workspace: '../outside/pattern.md'",
        resolvedCatalog(
          [],
          [],
          compatibilityCatalog(
            [
              {
                ...gritCompatibilityRule,
                runner: {
                  ...gritCompatibilityRule.runner,
                  pattern: {
                    ...gritCompatibilityRule.runner.pattern,
                    relativePath: "../outside/pattern.md",
                  },
                },
              },
            ],
            { "service-a": "services/a" }
          )
        ),
        compatibilityConfigFiles,
      ],
      [
        "path escapes the workspace: '../outside/**/*.ts'",
        resolvedCatalog(
          [],
          [],
          compatibilityCatalog(
            [{ ...gritCompatibilityRule, coveragePatterns: ["../outside/**/*.ts"] }],
            { "service-a": "services/a" }
          )
        ),
        compatibilityConfigFiles,
      ],
      [
        "duplicate target 'service-a:habitat:rule:source-compat'",
        resolvedCatalog(
          [],
          [],
          compatibilityCatalog([gritCompatibilityRule, gritCompatibilityRule], {
            "service-a": "services/a",
          })
        ),
        compatibilityConfigFiles,
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

  it("retains no targets across mixed, empty, and application-only resolutions", async () => {
    const resolve = vi
      .fn()
      .mockResolvedValueOnce(
        resolvedCatalog(
          [gritApplication],
          [serviceInstance],
          compatibilityCatalog([gritCompatibilityRule], { "service-a": "services/a" })
        )
      )
      .mockResolvedValueOnce(resolvedCatalog([], []))
      .mockResolvedValueOnce(resolvedCatalog([structureApplication], [pluginInstance]));
    const createNodes = createHandler(() => ({ catalog: { resolve } }));
    const context = { workspaceRoot: "/workspace", nxJsonConfiguration: {} };

    const authorityFiles = [...configFiles, ...compatibilityConfigFiles];
    const first = projectMap(await createNodes(authorityFiles, undefined, context));
    const second = projectMap(await createNodes(authorityFiles, undefined, context));
    const third = projectMap(await createNodes(authorityFiles, undefined, context));

    expect(Object.keys(first)).toEqual(["services/a"]);
    expect(second).toEqual({});
    expect(Object.keys(third)).toEqual(["plugins/b"]);
    expect(Object.keys(first["services/a"]?.targets ?? {})).toEqual([
      "check:policy",
      "habitat:application:service-a:source-law",
      "habitat:rule:source-compat",
    ]);
    expect(Object.keys(third["plugins/b"]?.targets ?? {})).toEqual([
      "check:policy",
      "habitat:application:@scope/plugin-b:plugin-structure",
    ]);
    expect(resolve).toHaveBeenCalledTimes(3);
  });
});
