import { posix } from "node:path";
import type { HabitatClient } from "@habitat-ai/sdk";
import type { CreateNodes, CreateNodesResultArray, TargetConfiguration } from "@nx/devkit";

const HABITAT_CATALOG_PATHS = [
  ".habitat/blueprints/*/blueprint.toml",
  ".habitat/index.json",
  ".habitat/**/rule.json",
  "**/habitat.toml",
] as const;
const HABITAT_AUTHORITY_GLOB = `{${HABITAT_CATALOG_PATHS.join(",")}}`;
const DEFAULT_CHECK_TARGET = "check:policy";
const HABITAT_EXECUTABLE = "habitat";
const PORTABLE_OWNER_PROJECT = /^[A-Za-z0-9@][A-Za-z0-9@._/+:-]*$/u;

type ResolveCatalogClient = {
  readonly catalog: Pick<HabitatClient["catalog"], "resolve">;
};

type ResolveCatalogResult = Awaited<ReturnType<ResolveCatalogClient["catalog"]["resolve"]>>;
type ResolvedCatalog = Extract<ResolveCatalogResult, { _tag: "Resolved" }>["catalog"];
type ResolvedApplication = ResolvedCatalog["applications"][number];
type ResolvedInstance = ResolvedCatalog["instances"][number];
type CompatibilityRule = ResolvedCatalog["compatibility"]["rules"][number];
type ResolvedRuleAsset =
  | Extract<ResolvedApplication["runner"], { name: "grit" }>["pattern"]
  | Extract<ResolvedApplication["runner"], { name: "habitat" }>["structure"]
  | CompatibilityRule["baseline"]
  | Extract<CompatibilityRule["runner"], { name: "grit" }>["pattern"]
  | Extract<CompatibilityRule["runner"], { name: "habitat" }>["structure"];
type TargetInput = NonNullable<TargetConfiguration["inputs"]>[number];

type ProjectProjection = {
  readonly ownerProject: string;
  readonly applicationManifests: Set<string>;
  readonly compatibilityManifests: Set<string>;
  readonly targets: Record<string, TargetConfiguration>;
};

/**
 * Supplies the ready Habitat client for the workspace being projected by Nx.
 *
 * The Habitat app owns this capability because Nx plugin options are serialized
 * configuration and cannot carry a client, provider, or runtime handle.
 */
export type HabitatClientForWorkspace = (
  workspaceRoot: string
) => ResolveCatalogClient | Promise<ResolveCatalogClient>;

/** App-owned runtime and provider facts required for sound target caching. */
export type HabitatNxBinding = {
  readonly clientForWorkspace: HabitatClientForWorkspace;
  readonly runtimeInputs: readonly [TargetInput, ...TargetInput[]];
};

/**
 * Projects resolved Habitat applications and compatibility rules into native Nx targets.
 *
 * The factory receives the app-owned workspace client and runtime cache facts.
 * It does not select providers, discover authority, execute checks, or name
 * projects.
 */
export function createHabitatNxPlugin(
  binding: HabitatNxBinding
): Readonly<{ createNodes: CreateNodes<undefined> }> {
  const createNodes: CreateNodes<undefined> = [
    HABITAT_AUTHORITY_GLOB,
    async (configFiles, _options, context) => {
      const matchedFiles = [...new Set(configFiles.map(normalizeWorkspacePath))].sort();
      const client = await binding.clientForWorkspace(context.workspaceRoot);
      const result = await client.catalog.resolve({});
      if (result._tag === "Rejected") throw rejectedCatalogError(result);

      return projectCatalogTargets(matchedFiles, result.catalog, binding.runtimeInputs);
    },
  ];

  return Object.freeze({ createNodes });
}

function projectCatalogTargets(
  matchedFiles: readonly string[],
  catalog: ResolvedCatalog,
  runtimeInputs: HabitatNxBinding["runtimeInputs"]
): CreateNodesResultArray {
  if (catalog.applications.length === 0 && catalog.compatibility.rules.length === 0) return [];

  const authorityFiles = new Set(matchedFiles);
  const instances = indexInstances(catalog.instances);
  const rootsByOwner = new Map<string, string>();
  const ownersByRoot = new Map<string, string>();
  const projects = new Map<string, ProjectProjection>();

  for (const [ownerProject, ownerRoot] of Object.entries(catalog.compatibility.ownerRoots).sort(
    ([left], [right]) => compareText(left, right)
  )) {
    recordOwnerRoot(ownerProject, ownerRoot, rootsByOwner, ownersByRoot);
  }

  for (const application of catalog.applications) {
    const instance = requireApplicationInstance(application, instances);
    const manifestPath = requireMatchedManifest(
      application.manifestPath,
      authorityFiles,
      `instance '${instance.id}'`
    );
    const root = recordOwnerRoot(
      application.ownerProject,
      projectRootFor(manifestPath),
      rootsByOwner,
      ownersByRoot
    );
    const project = projectFor(projects, root, application.ownerProject);
    project.applicationManifests.add(manifestPath);

    const targetName = applicationTargetName(application);
    addLeafTarget(project, targetName, applicationTarget(application, runtimeInputs));
  }

  for (const rule of catalog.compatibility.rules) {
    const root = rootsByOwner.get(rule.ownerProject);
    if (root === undefined) {
      throw new Error(
        `Habitat Nx projection rejected compatibility rule '${rule.ruleId}': owner '${rule.ownerProject}' has no root.`
      );
    }
    const manifestPath = requireMatchedManifest(
      rule.manifestPath,
      authorityFiles,
      `compatibility rule '${rule.ruleId}'`
    );
    const project = projectFor(projects, root, rule.ownerProject);
    project.compatibilityManifests.add(manifestPath);
    addLeafTarget(project, compatibilityTargetName(rule), compatibilityTarget(rule, runtimeInputs));
  }

  return [...projects.entries()]
    .sort(([left], [right]) => compareText(left, right))
    .map(([root, project]) => {
      project.targets[DEFAULT_CHECK_TARGET] = ownerTarget(
        project.ownerProject,
        ownerInputs(project.targets, runtimeInputs),
        project.compatibilityManifests.size > 0
      );
      return [
        projectionSource(project),
        {
          projects: {
            [root]: {
              targets: Object.fromEntries(
                Object.entries(project.targets).sort(([left], [right]) => compareText(left, right))
              ),
            },
          },
        },
      ] as const;
    });
}

function recordOwnerRoot(
  ownerProject: string,
  ownerRoot: string,
  rootsByOwner: Map<string, string>,
  ownersByRoot: Map<string, string>
): string {
  const root = normalizeWorkspacePath(ownerRoot);
  const priorRoot = rootsByOwner.get(ownerProject);
  if (priorRoot !== undefined && priorRoot !== root) {
    throw new Error(
      `Habitat Nx projection rejected owner '${ownerProject}': roots '${priorRoot}' and '${root}' collide.`
    );
  }
  const priorOwner = ownersByRoot.get(root);
  if (priorOwner !== undefined && priorOwner !== ownerProject) {
    throw new Error(
      `Habitat Nx projection rejected root '${root}': owners '${priorOwner}' and '${ownerProject}' collide.`
    );
  }
  rootsByOwner.set(ownerProject, root);
  ownersByRoot.set(root, ownerProject);
  return root;
}

function projectFor(
  projects: Map<string, ProjectProjection>,
  root: string,
  ownerProject: string
): ProjectProjection {
  const project = projects.get(root);
  if (project !== undefined) {
    if (project.ownerProject !== ownerProject) {
      throw new Error(
        `Habitat Nx projection rejected root '${root}': owners '${project.ownerProject}' and '${ownerProject}' collide.`
      );
    }
    return project;
  }

  const created = {
    ownerProject,
    applicationManifests: new Set<string>(),
    compatibilityManifests: new Set<string>(),
    targets: {},
  };
  projects.set(root, created);
  return created;
}

function requireMatchedManifest(
  path: string,
  authorityFiles: ReadonlySet<string>,
  subject: string
): string {
  const manifestPath = normalizeWorkspacePath(path);
  if (!authorityFiles.has(manifestPath)) {
    throw new Error(
      `Habitat Nx projection rejected ${subject}: manifest '${manifestPath}' is outside the matched authority files.`
    );
  }
  return manifestPath;
}

function addLeafTarget(
  project: ProjectProjection,
  targetName: string,
  target: TargetConfiguration
): void {
  if (Object.hasOwn(project.targets, targetName)) {
    throw new Error(
      `Habitat Nx projection rejected duplicate target '${project.ownerProject}:${targetName}'.`
    );
  }
  project.targets[targetName] = target;
}

function projectionSource(project: ProjectProjection): string {
  const applicationManifest = [...project.applicationManifests].sort(compareText)[0];
  if (applicationManifest !== undefined) return applicationManifest;

  const compatibilityManifest = [...project.compatibilityManifests].sort(compareText)[0];
  if (compatibilityManifest === undefined) {
    throw new Error(
      `Habitat Nx projection rejected owner '${project.ownerProject}': projected targets have no manifest.`
    );
  }
  return compatibilityManifest;
}

function requireApplicationInstance(
  application: ResolvedApplication,
  instances: ReadonlyMap<string, ResolvedInstance>
): ResolvedInstance {
  const instance = instances.get(application.instanceId);
  if (!instance) {
    throw new Error(
      `Habitat Nx projection rejected application '${application.ruleId}': instance '${application.instanceId}' is absent.`
    );
  }

  const mismatches = [
    instance.ownerProject === application.ownerProject
      ? undefined
      : `owner '${application.ownerProject}' does not match '${instance.ownerProject}'`,
    instance.blueprint === application.blueprint
      ? undefined
      : `blueprint '${application.blueprint}' does not match '${instance.blueprint}'`,
    instance.blueprintVersion === application.blueprintVersion
      ? undefined
      : `blueprint version '${application.blueprintVersion}' does not match '${instance.blueprintVersion}'`,
    normalizeWorkspacePath(instance.manifestPath) ===
    normalizeWorkspacePath(application.manifestPath)
      ? undefined
      : `manifest '${application.manifestPath}' does not match '${instance.manifestPath}'`,
  ].filter((mismatch): mismatch is string => mismatch !== undefined);

  if (mismatches.length > 0) {
    throw new Error(
      `Habitat Nx projection rejected instance '${instance.id}': ${mismatches.join("; ")}.`
    );
  }

  return instance;
}

function indexInstances(instances: readonly ResolvedInstance[]): Map<string, ResolvedInstance> {
  const indexed = new Map<string, ResolvedInstance>();
  for (const instance of instances) {
    if (indexed.has(instance.id)) {
      throw new Error(`Habitat Nx projection rejected duplicate instance '${instance.id}'.`);
    }
    indexed.set(instance.id, instance);
  }
  return indexed;
}

function applicationTargetName(application: ResolvedApplication): string {
  return `habitat:application:${application.instanceId}:${application.ruleId}`;
}

function compatibilityTargetName(rule: CompatibilityRule): string {
  return `habitat:rule:${rule.ruleId}`;
}

function applicationTarget(
  application: ResolvedApplication,
  runtimeInputs: HabitatNxBinding["runtimeInputs"]
): TargetConfiguration {
  return {
    command: `${HABITAT_EXECUTABLE} check --instance ${application.instanceId} --rule ${application.ruleId}`,
    cache: true,
    parallelism: false,
    inputs: applicationInputs(application, runtimeInputs),
    outputs: [],
    options: { cwd: "{workspaceRoot}" },
    metadata: {
      description: `Check Habitat application ${application.instanceId}/${application.ruleId}`,
    },
  };
}

function compatibilityTarget(
  rule: CompatibilityRule,
  runtimeInputs: HabitatNxBinding["runtimeInputs"]
): TargetConfiguration {
  return {
    command: `${HABITAT_EXECUTABLE} check --rule ${rule.ruleId}`,
    cache: true,
    parallelism: false,
    inputs: compatibilityInputs(rule, runtimeInputs),
    outputs: [],
    options: { cwd: "{workspaceRoot}" },
    metadata: { description: `Check Habitat compatibility rule ${rule.ruleId}` },
  };
}

function ownerTarget(
  ownerProject: string,
  inputs: TargetConfiguration["inputs"],
  hasCompatibility: boolean
): TargetConfiguration {
  if (!PORTABLE_OWNER_PROJECT.test(ownerProject)) {
    throw new Error(
      `Habitat Nx projection rejected owner '${ownerProject}': identity is not portable as an Nx command argument.`
    );
  }
  return {
    command: `${HABITAT_EXECUTABLE} check --owner ${ownerProject}`,
    cache: true,
    parallelism: false,
    inputs,
    outputs: [],
    options: { cwd: "{workspaceRoot}" },
    metadata: {
      description: hasCompatibility
        ? `Check resolved Habitat policy owned by ${ownerProject}`
        : `Check resolved Habitat applications owned by ${ownerProject}`,
    },
  };
}

function ownerInputs(
  targets: Readonly<Record<string, TargetConfiguration>>,
  runtimeInputs: HabitatNxBinding["runtimeInputs"]
): TargetConfiguration["inputs"] {
  const runtimeStrings = new Set(
    runtimeInputs.filter((input): input is string => typeof input === "string")
  );
  const corpusInputs = new Set<string>();
  for (const target of Object.values(targets)) {
    for (const input of target.inputs ?? []) {
      if (typeof input === "string" && !runtimeStrings.has(input)) corpusInputs.add(input);
    }
  }
  return [...runtimeInputs, ...[...corpusInputs].sort(compareText)];
}

function applicationInputs(
  application: ResolvedApplication,
  runtimeInputs: HabitatNxBinding["runtimeInputs"]
): TargetConfiguration["inputs"] {
  const files = new Set<string>(HABITAT_CATALOG_PATHS.map(workspaceInput));

  if (application.runner.name === "grit") {
    addLocalAssetInput(files, application.runner.pattern);
    for (const entry of application.runner.acquisition.entries) {
      if (entry.source.kind === "root-pattern") {
        files.add(workspaceInput(entry.path));
      } else {
        addSubjectInputs(files, entry.path, entry.kind);
      }
    }
  } else {
    addLocalAssetInput(files, application.runner.structure);
    for (const binding of application.runner.rootBindings) {
      if (binding.path !== undefined) addSubjectInputs(files, binding.path, binding.kind);
    }
  }

  return [...runtimeInputs, ...[...files].sort()];
}

function compatibilityInputs(
  rule: CompatibilityRule,
  runtimeInputs: HabitatNxBinding["runtimeInputs"]
): TargetConfiguration["inputs"] {
  const files = new Set<string>(HABITAT_CATALOG_PATHS.map(workspaceInput));
  files.add(workspaceInput(".habitat/**"));
  files.add(workspaceInput(rule.manifestPath));
  addLocalAssetInput(files, rule.baseline);
  for (const pattern of rule.coveragePatterns) files.add(workspaceInput(pattern));
  if (rule.runner.name === "grit") {
    addLocalAssetInput(files, rule.runner.pattern);
    for (const entry of rule.runner.acquisition.entries) {
      if (entry.kind === "directory" && entry.path === ".") continue;
      addSubjectInputs(files, entry.path, entry.kind);
    }
  } else {
    addLocalAssetInput(files, rule.runner.structure);
  }

  return [...runtimeInputs, ...[...files].sort(compareText)];
}

function addLocalAssetInput(target: Set<string>, asset: ResolvedRuleAsset): void {
  if (asset.provenance.kind === "local") target.add(workspaceInput(asset.relativePath));
}

function addSubjectInputs(target: Set<string>, path: string, kind: "directory" | "file"): void {
  const exact = workspaceInput(path);
  if (kind === "directory" && path === ".") {
    target.add("{workspaceRoot}/**/*");
    return;
  }
  target.add(exact);
  if (kind === "directory") target.add(`${exact}/**/*`);
}

function workspaceInput(path: string): string {
  const normalized = normalizeWorkspacePath(path);
  return normalized === "." ? "{workspaceRoot}" : `{workspaceRoot}/${normalized}`;
}

function projectRootFor(manifestPath: string): string {
  const root = posix.dirname(manifestPath);
  return root === "" ? "." : root;
}

function normalizeWorkspacePath(path: string): string {
  const slashPath = path.replaceAll("\\", "/");
  if (posix.isAbsolute(slashPath) || /^[A-Za-z]:\//.test(slashPath)) {
    throw new Error(`Habitat Nx projection requires a workspace-relative path: '${path}'.`);
  }

  const normalized = posix.normalize(slashPath).replace(/^\.\//, "");
  if (normalized === ".." || normalized.startsWith("../")) {
    throw new Error(`Habitat Nx projection path escapes the workspace: '${path}'.`);
  }
  return normalized === "" ? "." : normalized;
}

function rejectedCatalogError(result: Extract<ResolveCatalogResult, { _tag: "Rejected" }>): Error {
  return new Error(
    `Habitat catalog resolution rejected during Nx projection: ${JSON.stringify(result.issues)}`
  );
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
