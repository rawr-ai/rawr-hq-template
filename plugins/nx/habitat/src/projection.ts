import { posix } from "node:path";
import type { Client } from "@habitat/service/client";
import type {
  CreateNodes,
  CreateNodesResultArray,
  NxPlugin,
  TargetConfiguration,
} from "@nx/devkit";

const HABITAT_AUTHORITY_GLOB = "{.habitat/**/*,**/habitat.toml}";
const DEFAULT_CHECK_TARGET = "check:policy";
const HABITAT_EXECUTABLE = "habitat";

type ResolveCatalogClient = {
  readonly catalog: Pick<Client["catalog"], "resolve">;
};

type ResolveCatalogResult = Awaited<ReturnType<ResolveCatalogClient["catalog"]["resolve"]>>;
type ResolvedCatalog = Extract<ResolveCatalogResult, { _tag: "Resolved" }>["catalog"];
type ResolvedApplication = ResolvedCatalog["applications"][number];
type ResolvedInstance = ResolvedCatalog["instances"][number];
type TargetInput = NonNullable<TargetConfiguration["inputs"]>[number];

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

/** Serialized configuration for the owner-local aggregate target name. */
export type HabitatNxPluginOptions = {
  readonly checkTargetName?: string;
};

/**
 * Projects service-resolved Habitat applications into native Nx targets.
 *
 * The factory receives the app-owned workspace client and runtime cache facts.
 * It does not select providers, discover authority, execute checks, or name
 * projects.
 */
export function createHabitatNxPlugin(
  binding: HabitatNxBinding
): Omit<NxPlugin<HabitatNxPluginOptions>, "name"> {
  const createNodes: CreateNodes<HabitatNxPluginOptions> = [
    HABITAT_AUTHORITY_GLOB,
    async (configFiles, options, context) => {
      const matchedFiles = [...new Set(configFiles.map(normalizeWorkspacePath))].sort();
      const client = await binding.clientForWorkspace(context.workspaceRoot);
      const result = await client.catalog.resolve({});
      if (result._tag === "Rejected") throw rejectedCatalogError(result);

      return projectApplications(
        matchedFiles,
        result.catalog,
        checkTargetName(options),
        binding.runtimeInputs
      );
    },
  ];

  return Object.freeze({ createNodes });
}

function projectApplications(
  matchedFiles: readonly string[],
  catalog: ResolvedCatalog,
  aggregateTargetName: string,
  runtimeInputs: HabitatNxBinding["runtimeInputs"]
): CreateNodesResultArray {
  if (catalog.applications.length === 0) return [];

  const anchor = matchedFiles[0];
  if (anchor === undefined) {
    throw new Error("Habitat Nx projection cannot attach applications without authority files.");
  }

  const authorityFiles = new Set(matchedFiles);
  const instances = indexInstances(catalog.instances);
  const rootsByOwner = new Map<string, string>();
  const projects = new Map<
    string,
    { readonly ownerProject: string; readonly targets: Record<string, TargetConfiguration> }
  >();

  for (const application of catalog.applications) {
    const instance = requireApplicationInstance(application, instances);
    const manifestPath = normalizeWorkspacePath(application.manifestPath);
    if (!authorityFiles.has(manifestPath)) {
      throw new Error(
        `Habitat Nx projection rejected instance '${instance.id}': manifest '${manifestPath}' is outside the matched authority files.`
      );
    }

    const root = projectRootFor(manifestPath);
    const priorRoot = rootsByOwner.get(application.ownerProject);
    if (priorRoot !== undefined && priorRoot !== root) {
      throw new Error(
        `Habitat Nx projection rejected owner '${application.ownerProject}': roots '${priorRoot}' and '${root}' collide.`
      );
    }
    rootsByOwner.set(application.ownerProject, root);

    const project = projects.get(root) ?? {
      ownerProject: application.ownerProject,
      targets: {},
    };
    if (project.ownerProject !== application.ownerProject) {
      throw new Error(
        `Habitat Nx projection rejected root '${root}': owners '${project.ownerProject}' and '${application.ownerProject}' collide.`
      );
    }

    const targetName = applicationTargetName(application);
    if (Object.hasOwn(project.targets, targetName)) {
      throw new Error(
        `Habitat Nx projection rejected duplicate target '${application.ownerProject}:${targetName}'.`
      );
    }
    project.targets[targetName] = applicationTarget(application, runtimeInputs);
    projects.set(root, project);
  }

  const projected = Object.fromEntries(
    [...projects.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([root, project]) => {
        const leafTargets = Object.keys(project.targets).sort();
        if (Object.hasOwn(project.targets, aggregateTargetName)) {
          throw new Error(
            `Habitat Nx projection rejected aggregate target '${aggregateTargetName}': it collides with an application target in '${project.ownerProject}'.`
          );
        }
        project.targets[aggregateTargetName] = ownerTarget(project.ownerProject, leafTargets);
        return [
          root,
          {
            targets: Object.fromEntries(
              Object.entries(project.targets).sort(([left], [right]) => left.localeCompare(right))
            ),
          },
        ];
      })
  );

  return [[anchor, { projects: projected }]];
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

function checkTargetName(options: HabitatNxPluginOptions | undefined): string {
  const targetName = options?.checkTargetName ?? DEFAULT_CHECK_TARGET;
  if (targetName.length === 0 || targetName.trim() !== targetName) {
    throw new Error("Habitat Nx projection requires a non-empty, trimmed check target name.");
  }
  return targetName;
}

function applicationTargetName(application: ResolvedApplication): string {
  return `habitat:application:${application.instanceId}:${application.ruleId}`;
}

function applicationTarget(
  application: ResolvedApplication,
  runtimeInputs: HabitatNxBinding["runtimeInputs"]
): TargetConfiguration {
  return {
    command: `${HABITAT_EXECUTABLE} check --instance ${application.instanceId} --rule ${application.ruleId}`,
    cache: true,
    inputs: applicationInputs(application, runtimeInputs),
    outputs: [],
    options: { cwd: "{workspaceRoot}" },
    metadata: {
      description: `Check Habitat application ${application.instanceId}/${application.ruleId}`,
    },
  };
}

function ownerTarget(ownerProject: string, leafTargets: readonly string[]): TargetConfiguration {
  return {
    executor: "nx:noop",
    cache: false,
    outputs: [],
    dependsOn: leafTargets.map((target) => ({ target })),
    metadata: { description: `Check resolved Habitat applications owned by ${ownerProject}` },
  };
}

function applicationInputs(
  application: ResolvedApplication,
  runtimeInputs: HabitatNxBinding["runtimeInputs"]
): TargetConfiguration["inputs"] {
  const files = new Set<string>([
    "{workspaceRoot}/.habitat/**/*",
    "{workspaceRoot}/**/habitat.toml",
    workspaceInput(application.manifestPath),
    workspaceInput(application.provenance.relativePath),
  ]);

  if (application.runner.name === "grit") {
    files.add(workspaceInput(application.runner.pattern.relativePath));
    for (const entry of application.runner.acquisition.entries) {
      addSubjectInputs(files, entry.path, entry.kind);
    }
  } else {
    files.add(workspaceInput(application.runner.structure.relativePath));
    for (const binding of application.runner.rootBindings) {
      if (binding.path !== undefined) addSubjectInputs(files, binding.path, binding.kind);
    }
  }

  return [...runtimeInputs, ...[...files].sort()];
}

function addSubjectInputs(target: Set<string>, path: string, kind: "directory" | "file"): void {
  const exact = workspaceInput(path);
  target.add(exact);
  if (kind === "directory") {
    target.add(path === "." ? "{workspaceRoot}/**/*" : `${exact}/**/*`);
  }
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
